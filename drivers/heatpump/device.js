'use strict';

const { Device } = require('homey');
const fetch = require('node-fetch');

class Heatpump extends Device {

  address = this.getStoreValue('address');
  port = this.getStoreValue('port');

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Heatpump has been initialized');

    // Register capabilities
    await this.addCapability('meter_power');
    await this.addCapability('measure_power');

    this.registerCapabilityListener('target_temperature', async (value) => {
      this.setStoreValue('target_temperature', value);
      this.sendCommand(this.getStoreValue('thermostat_mode'), this.getStoreValue('fan_speed'), value);
    });

    this.registerCapabilityListener('fan_speed', async (value) => {
      this.setStoreValue('fan_speed', value);
      this.sendCommand(this.getStoreValue('thermostat_mode'), value, this.getStoreValue('target_temperature'));
    });

    this.registerCapabilityListener('thermostat_mode', async (value) => {
      if (value === 'auto') {
        this.setCapabilityValue('thermostat_mode', 'heat');
        return;
      }
      this.setStoreValue('thermostat_mode', value);
      this.sendCommand(value, this.getStoreValue('fan_speed'), this.getStoreValue('target_temperature'));
    });

    // Read value from external source
    this.getTemp();
    this.getPower();
    setInterval(() => this.getTemp(), 60000);
    setInterval(() => this.getPower(), 5000);
  }

  /**
   * Commands external source
   */
  async sendCommand(mode = this.getStoreValue('thermostat_mode'), fanspeed = this.getStoreValue('fan_speed'), temp = this.getStoreValue('target_temperature')) {
    // Set fan speed flow card action
    if (mode === 'flow' && temp === 'flow') {
      this.log('Setting fan speed from action flow card');
      mode = this.getStoreValue('thermostat_mode');
      temp = this.getStoreValue('target_temperature');
    }

    let command = `${mode}_${fanspeed}_${temp}`;
    this.log('sending command', command);

    // Skruv av hvis thermostat mode = off
    if (mode === 'off' && this.getStoreValue('power') === true) {
      command = 'power_off';
      this.setStoreValue('power', false);
      fetch(`http://${this.address}:${this.port}/`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: `{ "command": "${command}" }` })
        .then((res) => res.json())
        .then((json) => this.reportStatus(json, command, mode, fanspeed, temp))
        .catch((error) => {
          this.log('Failed commanding AC unit', error);
          this.setUnavailable('Did not recieve any response from AC');
        });

    // Skru på hvis siste thermostat mode var off
    } else if (mode !== 'off' && this.getStoreValue('power') === false) {
      fetch(`http://${this.address}:${this.port}/`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: '{ "command": "power_on" }' })
        .then((res) => res.json())
        .then((json) => {
          this.log('Command sent:', 'power_on', 'message recieved:', json.status);

          // Vent 1 sek før videre kommandoer sendes
          setTimeout(() => {
            fetch(`http://${this.address}:${this.port}/`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: `{ "command": "${command}" }` })
              .then((res) => res.json())
              .then((json) => this.reportStatus(json, command, mode, fanspeed, temp))
              .catch((error) => {
                this.log('Failed commanding AC unit', error);
                this.setUnavailable('Did not recieve any response from AC');
              });
          }, 1000);
        })
        .catch((error) => {
          this.log('Failed commanding AC unit', error);
          this.setUnavailable('Did not recieve any response from AC');
        });
      this.setStoreValue('power', true);

    // Send kommando hvis den allerede er på
    } else if (mode !== 'off') {
      fetch(`http://${this.address}:${this.port}/`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: `{ "command": "${command}" }` })
        .then((res) => res.json())
        .then((json) => this.reportStatus(json, command, mode, fanspeed, temp))
        .catch((error) => {
          this.log('Failed commanding AC unit', error);
          this.setUnavailable('Did not recieve any response from AC');
        });
    }
  }

  async reportStatus(json, command, mode, fanspeed, temp) {
    this.log('Command sent:', command, 'message recieved:', json.status);
    this.setStoreValue('thermostat_mode', mode);
    this.setStoreValue('fan_speed', fanspeed);
    this.setStoreValue('target_temperature', temp);

    this.setCapabilityValue('thermostat_mode', mode);
    this.setCapabilityValue('fan_speed', fanspeed);
    this.setCapabilityValue('target_temperature', temp);
  }

  /**
   * Read value from external source
   */
  async getTemp() {
    fetch('http://192.168.1.104/netatmo.json', { method: 'GET' })
      .then((res) => res.json())
      .then((json) => {
        this.setCapabilityValue('measure_temperature', json.inne.now);
        this.setStoreValue('measure_temperature', json.inne.now);
      })
      .catch((error) => {
        this.log('Failed getting current temperature', error);
      });
  }

  /**
   * Get power from shelly sensor
   */
  async getPower() {
    // Break on off
    if (this.getStoreValue('thermostat_mode') === 'off') {
      return;
    }

    fetch('http://192.168.1.38/rpc/PM1.GetStatus?id=0')
      .then((res) => res.json())
      .then((json) => {
        const current = json.aenergy.total || 0; // Wh
        const currentW = Math.abs(json.apower) || 0; // W
        const longterm = this.getStoreValue('longterm') || 0;
        const previous = this.getStoreValue('previous_power') || current;
        const change = current - previous;

        if (change > 0) {
          const totalWh = longterm + change;

          // Oppdater verdier
          this.log('incremented', change);
          this.setStoreValue('longterm', totalWh);
          this.setCapabilityValue('meter_power', totalWh / 1000);
        }

        // Sett nåværende til forrige verdi
        this.setStoreValue('previous_power', current);

        // Oppdater watt
        this.setCapabilityValue('measure_power', currentW);

        this.log('latest:', current, '- previous:', previous, '- longterm:', this.getStoreValue('longterm'));

        this.unsetWarning();
      })
      .catch((err) => {
        this.log(`Failed getting power ${err}`);
        this.setWarning(`Failed getting power ${err}`);
      });
  }

}

module.exports = Heatpump;
