'use strict';

const { Device } = require('homey');
const fetch = require('node-fetch');

class PanelOvenDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Panel Oven has been initialized');
    let token = 'init';

    // Renew token on start
    this.renewToken((newToken) => {
      token = newToken;
      setTimeout(() => {
        this.fetchData(token);
      }, 2000);
    });

    setInterval(() => {
      this.fetchData(token);
    }, 60000);

    setInterval(() => {
      this.renewToken((newToken) => {
        token = newToken;
      });
    }, 5 * 60000);

    /**
    * Ta seg av kommandoer i fra Homey
    */
    this.registerCapabilityListener('target_temperature', async (value) => {
      this.sendCommand(token, value);
    });
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
  async fetchData(token) {
    fetch('https://api-1.adax.no/client-api/rest/v1/content/?withEnergy=1', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
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
  async sendCommand(token, temp = 0) {
    this.log('command', temp);

    const payload = `{ "rooms": [  { "id": 176401, "targetTemperature": "${temp * 100}" } ] }`;

    fetch('https://api-1.adax.no/client-api/rest/v1/control', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: payload,
    })
      .then((res) => res.json())
      .then((json) => {
        const { status } = json.rooms[0];
        if (status !== 'OK') {
          this.setWarning(`Error: ${status}`);
          setTimeout(() => this.unsetWarning(), 3000);
        }
      })
      .catch((error) => {
        this.log(error);
        this.log('Did not recieve any response from Glamox');
        this.setWarning('Did not recieve any response from Glamox');
        setTimeout(() => this.unsetWarning(), 3000);
      });
  }

}

module.exports = PanelOvenDevice;
