'use strict';

const { Device } = require('homey');
const fetch = require('node-fetch');

class PanelOvenDevice extends Device {

  token = 'init';
  intervalChecker = null;

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Panel Oven has been initialized');

    // Renew token on start
    this.renewToken((newToken) => {
      this.token = newToken;
      setTimeout(() => this.fetchData(), 2000); // Read data
    });

    this.intervalManager(true);

    // Renew token on interval
    setInterval(() => {
      this.renewToken((newToken) => {
        this.token = newToken;
      });
    }, 5 * 60000);

    // Ta seg av kommandoer i fra Homey
    this.registerCapabilityListener('target_temperature', async (value) => this.sendCommand(value));
  }

  /**
   * Renew Glamox token
   */
  async renewToken(_callback) {
    const username = this.getStoreValue('username');
    const password = this.getStoreValue('password');
    const formBody = `grant_type=password&username=${username}&password=${password}`;

    fetch('https://api-1.adax.no/client-api/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: formBody,
    })
      .then((res) => res.json())
      .then((json) => {
        this.log('Token has been renewed');
        _callback(json.access_token);
      })
      .catch((error) => {
        this.log('Did not recieve any response from Glamox');
      });
  }

  /**
   * Fetch data
   */
  async fetchData() {
    fetch('https://api-1.adax.no/client-api/rest/v1/content/?withEnergy=1', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })
      .then((res) => res.json())
      .then((json) => {
        let targetTemp;
        if (json.rooms[0]?.targetTemperature) {
          targetTemp = json.rooms[0].targetTemperature / 100;
        } else {
          targetTemp = 4;
        }

        const measureTemp = json.rooms[0].temperature / 100;
        const meterPower = json.devices[0].energyWh / 1000;

        this.setCapabilityValue('measure_temperature', measureTemp);
        this.setCapabilityValue('target_temperature', targetTemp);
        this.setCapabilityValue('measure_power', targetTemp > measureTemp === true ? 800 : 0);
        this.setCapabilityValue('meter_power', meterPower);
        this.setAvailable();
      })
      .catch((error) => {
        this.log(error);
        this.log('Did not recieve any response from Glamox');
        this.setUnavailable('Did not recieve any response from Glamox');
      });
  }

  /**
   * Send command
   */
  async sendCommand(temp = 0) {
    this.log('sending command', temp);

    this.fetchData();
    this.intervalManager(false); // Stops current checking

    fetch('https://api-1.adax.no/client-api/rest/v1/control', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: `{ "rooms": [  { "id": 176401, "targetTemperature": "${temp * 100}" } ] }`,
    })
      .then((res) => res.json())
      .then((json) => {
        const { status } = json.rooms[0];

        if (status !== 'OK') {
          this.setWarning(`Error: ${status}`); // Set warning
          this.log(`Error: ${status}`);
          setTimeout(() => this.unsetWarning(), 3000); // Clears warning
        } else {
          this.log('Command recieved OK');
        }
        this.intervalManager(true); // Start interval checkin'
      })
      .catch((error) => {
        this.log('Error on response from Glamox');
        this.setWarning('Error on response from Glamox'); // Set warning
        setTimeout(() => this.unsetWarning(), 3000); // Clears warning
        this.intervalManager(true); // Start interval checkin'
      });
  }

  /**
   * Start and stop interval for status checker
   */
  async intervalManager(start) {
    if (start) {
      this.log('Started/restarted interval checker');
      this.intervalChecker = setInterval(() => this.fetchData(), 60000);
    } else {
      this.log('Cleared interval checker');
      clearInterval(this.intervalChecker);
    }
  }

}

module.exports = PanelOvenDevice;
