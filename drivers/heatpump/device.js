'use strict';

const { Device } = require('homey');
const fetch = require('node-fetch');

class Heatpump extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Heatpump has been initialized');
    const address = this.getStoreValue('address');
    const port = this.getStoreValue('port');

    /**
    * Ta seg av kommandoer i fra Homey
    */
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

    /**
     * Les verdier i fra persistent storage
     */
    if (!this.getStoreValue('target_temperature')) {
      this.setCapabilityValue('target_temperature', 23);
      this.setStoreValue('target_temperature', 23);
    } else {
      this.setCapabilityValue('target_temperature', this.getStoreValue('target_temperature'));
    }
    this.setCapabilityValue('fan_speed', this.getStoreValue('fan_speed').toString());
    this.setCapabilityValue('thermostat_mode', this.getStoreValue('thermostat_mode'));

    /**
     * Read value from external source
     */
    setInterval(() => {
      fetch(`http://${address}:${port}/`, { method: 'GET' })
        .then((res) => res.json())
        .then((json) => {
          this.setAvailable();
          this.setCapabilityValue('measure_temperature', json.currentTemperature);
        })
        .catch((error) => {
          this.log('Did not recieve any response from AC');
          this.setUnavailable('Did not recieve any response from AC');
        });
    }, 1000);
  }

  async sendCommand(mode, fanspeed, temp) {
    const address = this.getStoreValue('address');
    const port = this.getStoreValue('port');

    let command = `${mode}_${fanspeed}_${temp}`;

    // Skruv av hvis thermostat mode = off
    if (mode === 'off' && this.getStoreValue('power') === true) {
      command = 'power_off';
      this.setStoreValue('power', false);
      fetch(`http://${address}:${port}/`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: `{ "command": "${command}" }` })
        .then((res) => res.json())
        .then((json) => {
          this.log('Command sent:', command, 'message recieved:', json.status);
        })
        .catch((error) => {
          this.log('Failed commanding AC unit');
          this.setUnavailable('Did not recieve any response from AC');
        });

    // Skru på hvis siste thermostat mode var off
    } else if (mode !== 'off' && this.getStoreValue('power') === false) {
      fetch(`http://${address}:${port}/`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: '{ "command": "power_on" }' })
        .then((res) => res.json())
        .then((json) => {
          this.log('Command sent:', 'power_on', 'message recieved:', json.status);

          // Vent 1 sek før videre kommandoer sendes
          setTimeout(() => {
            fetch(`http://${address}:${port}/`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: `{ "command": "${command}" }` })
              .then((res) => res.json())
              .then((json) => {
                this.log('Command sent:', command, 'message recieved:', json.status);
              })
              .catch((error) => {
                this.log('Failed commanding AC unit');
                this.setUnavailable('Did not recieve any response from AC');
              });
          }, 1000);
        })
        .catch((error) => {
          this.log('Failed commanding AC unit');
          this.setUnavailable('Did not recieve any response from AC');
        });
      this.setStoreValue('power', true);

    // Send kommando hvis den allerede er på
    } else if (mode !== 'off') {
      fetch(`http://${address}:${port}/`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: `{ "command": "${command}" }` })
        .then((res) => res.json())
        .then((json) => {
          this.log('Command sent:', command, 'message recieved:', json.status);
        })
        .catch((error) => {
          this.log('Failed commanding AC unit');
          this.setUnavailable('Did not recieve any response from AC');
        });
    }
  }

}

module.exports = Heatpump;
