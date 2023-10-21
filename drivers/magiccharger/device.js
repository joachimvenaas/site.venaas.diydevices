'use strict';

const { Device } = require('homey');
const fetch = require('node-fetch');

class MagicChargerDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('MagicChargerDevice has been initialized');

    // Registers command
    this.registerCapabilityListener('onoff', async (value) => this.runCommand(value));

    if (this.hasCapability('custom_string.starts') === false) {
      await this.addCapability('custom_string.starts');
    }

    if (this.hasCapability('custom_string.finished') === false) {
      await this.addCapability('custom_string.finished');
    }

    if (this.hasCapability('custom_string.connected') === false) {
      await this.addCapability('custom_string.connected');
    }

    if (this.hasCapability('meter_power.needed') === false) {
      await this.addCapability('meter_power.needed');
    }

    // For each minute, check magic charger status
    this.fetchStatus();
    setInterval(() => this.fetchStatus(), 10000);
  }

  async fetchStatus() {
    const url = this.getStoreValue('url');
    const token = this.getStoreValue('token');
    fetch(`${url}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
    })
      .then((res) => res.json())
      .then((json) => {
        this.setAvailable(); // Mark device as available
        this.setCapabilityValue('onoff', json.status === 'running');

        if (json.status === 'running') {
          this.setCapabilityValue('custom_string.starts', json.charging_start);
          this.setCapabilityValue('custom_string.finished', '-');
          this.setCapabilityValue('custom_string.connected', json.connected ? 'Tilkoblet' : 'N/A');
          this.setCapabilityValue('meter_power.needed', json.charging_needed);
        } else {
          this.setCapabilityValue('custom_string.starts', '-');
          this.setCapabilityValue('custom_string.finished', '-');
          this.setCapabilityValue('custom_string.connected', '-');
          this.setCapabilityValue('meter_power.needed', 0);
        }
      })
      .catch((err) => {
        this.log(err);
        this.log('Did not recieve any response from magic charger');
        this.setUnavailable('Did not recieve any response from magic charger');
      });
  }

  async runCommand(value) {
    const url = this.getStoreValue('url');
    const token = this.getStoreValue('token');

    fetch(`${url}/${value ? 'start' : 'stop'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
    })
      .then((res) => res.json())
      .then((json) => {
        this.setAvailable(); // Mark device as available
        this.setCapabilityValue('onoff', json.status === 'started');
      })
      .catch(() => {
        this.log('Did not recieve any response from magic charger');
        this.setUnavailable('Did not recieve any response from magic charger');
      });
  }

}

module.exports = MagicChargerDevice;
