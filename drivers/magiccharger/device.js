'use strict';

const { Device } = require('homey');
const fetch = require('node-fetch');

class MagicChargerDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('MagicChargerDevice has been initialized');

    // Add capabilities
    this.registerCapabilityListener('onoff', async (value) => this.runCommand(value));

    // if (this.hasCapability('custom_string.starts') === false) {
    await this.addCapability('custom_string.starts');
    await this.addCapability('custom_string.finished');
    await this.addCapability('custom_string.connected');
    await this.addCapability('meter_power.needed');
    await this.addCapability('price.optimal');
    await this.addCapability('price.pluggedin');

    // Check magic charger status, loop
    this.fetchStatus();
    setInterval(() => this.fetchStatus(), 10000);
  }

  /**
   * Fetch status from API
   */
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
      // Resuponse -> JSON
      .then((res) => res.json())

      // JSON -> Homey
      .then((json) => {
        // Mark device as available
        this.setAvailable();

        // Update onoff capability
        this.setCapabilityValue('onoff', json.status === 'running');

        // Update values of capabilities
        if (json.status === 'running') {
          this.setCapabilityValue('custom_string.starts', json.charging_start);
          this.setCapabilityValue('custom_string.finished', json.charging_end);
          this.setCapabilityValue('custom_string.connected', json.connected ? 'Tilkoblet' : 'N/A');
          this.setCapabilityValue('meter_power.needed', json.charging_needed);
          this.setCapabilityValue('price.pluggedin', parseFloat(json.price_pluggedin));
          this.setCapabilityValue('price.optimal', parseFloat(json.price_optimal));
        } else {
          this.setCapabilityValue('custom_string.starts', '-');
          this.setCapabilityValue('custom_string.finished', '-');
          this.setCapabilityValue('custom_string.connected', '-');
          this.setCapabilityValue('meter_power.needed', 0);
          this.setCapabilityValue('price.pluggedin', 0);
          this.setCapabilityValue('price.optimal', 0);
        }
      })

      // 🐛 Errrrr handling
      .catch((err) => {
        this.log(err);
        this.setUnavailable(`Error: ${err}`);
      });
  }

  /**
   * Send command to API
   * @param {string} value Command to send to API
   */
  async runCommand(value) {
    // Grab settings from store
    const url = this.getStoreValue('url');
    const token = this.getStoreValue('token');

    // Send command to API
    fetch(`${url}/${value ? 'start' : 'stop'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
    })
      // Resuponse -> JSON
      .then((res) => res.json())

      // JSON -> Homey
      .then((json) => {
        this.setAvailable(); // Mark device as available
        this.setCapabilityValue('onoff', json.status === 'started'); // Update onoff capability
      })

      // 🐛 Errrrr handling
      .catch((err) => {
        this.log(err);
        this.setUnavailable(`Error: ${err}`);
      });
  }

}

module.exports = MagicChargerDevice;
