'use strict';

const { Device } = require('homey');
const fetch = require('node-fetch');

/*
 * TODO: Legg inn flow card for vifte hastighet
 */

class Heatpump extends Device {

  address = this.getStoreValue('address');
  port = this.getStoreValue('port');
  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Heatpump has been initialized');

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
     * Read value from external source
     */
    this.getState();
    setInterval(() => {
      this.getState();
    }, 10000);
  }

  /**
   * Commands external source
   */
  async sendCommand(mode, fanspeed, temp) {
    let command = `${mode}_${fanspeed}_${temp}`;
    this.log('sending command', command);

    // Skruv av hvis thermostat mode = off
    if (mode === 'off' && this.getStoreValue('power') === true) {
      command = 'power_off';
      this.setStoreValue('power', false);
      fetch(`http://${this.address}:${this.port}/`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: `{ "command": "${command}" }` })
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
      fetch(`http://${this.address}:${this.port}/`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: '{ "command": "power_on" }' })
        .then((res) => res.json())
        .then((json) => {
          this.log('Command sent:', 'power_on', 'message recieved:', json.status);

          // Vent 1 sek før videre kommandoer sendes
          setTimeout(() => {
            fetch(`http://${this.address}:${this.port}/`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: `{ "command": "${command}" }` })
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
      fetch(`http://${this.address}:${this.port}/`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: `{ "command": "${command}" }` })
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

  /**
   * Read value from external source
   */
  async getState() {
    fetch(`http://${this.address}:${this.port}/`, { method: 'GET' })
      .then((res) => res.json())
      .then((json) => {
        this.setAvailable();
        this.setCapabilityValue('measure_temperature', json.currentTemperature);
      })
      .catch((error) => {
        this.log('Did not recieve any response from AC');
        this.setUnavailable('Did not recieve any response from AC');
      });
  }

}

module.exports = Heatpump;
