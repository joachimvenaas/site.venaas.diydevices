'use strict';

const { Device } = require('homey');
const fetch = require('node-fetch');

class VentilationDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Ventilation Device has been initialized');
    const address = this.getStoreValue('address');
    const port = this.getStoreValue('port');

    this.registerCapabilityListener('ventilation_speed', async (value) => {
      this.sendCommand(value * 100);
    });

    /**
     * Read value from external source
     */
    setInterval(() => {
      fetch(`http://${address}:${port}/api`, { method: 'GET' })
        .then((res) => res.json())
        .then((json) => {
          this.setAvailable();
          this.setCapabilityValue('meter_power', json.speed).catch((err) => this.log(err));
          this.setCapabilityValue('ventilation_speed', json.speed / 100).catch((err) => this.log(err));
        })
        .catch((error) => {
          this.log('Did not recieve any response from Ventilation');
          this.setUnavailable('Did not recieve any response from Ventilation');
        });
    }, 1000);
  }

  async sendCommand(command) {
    const address = this.getStoreValue('address');
    const port = this.getStoreValue('port');
    this.log('command:', command);
    fetch(`http://${address}:${port}/${command}`, { method: 'GET' })
      .then((res) => res.text())
      .then((data) => {
        this.setAvailable();
        this.log('recieved message:', data);
      })
      .catch((error) => {
        this.log('Did not recieve any response from Ventilation');
        this.setUnavailable('Did not recieve any response from Ventilation');
      });
  }

}

module.exports = VentilationDevice;
