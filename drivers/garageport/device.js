'use strict';

const { Device } = require('homey');
const fetch = require('node-fetch');

class Garageport extends Device {

  status = 'unknown';
  address = this.getStoreValue('address');
  port = this.getStoreValue('port');

  async onInit() {
    this.log('Garageport device has been initialized');

    this.setCapabilityValue('alarm_motion', false).catch((err) => this.log(err));

    /**
     * Send command to garageport open/close
     * Set status to opening/closing while moving to prevent directional changes
     */
    this.registerCapabilityListener('garagedoor_closed', async (value) => {
      this.runCommand(value);
    });

    /**
     * Read value from external source
     */
    this.getStatus();
    setInterval(() => {
      this.getStatus();
    }, 2000);
  }

  /**
   * Read value from external source
   */
  async getStatus() {
    fetch(`http://${this.address}:${this.port}/`, { method: 'GET' })
      .then((res) => res.json())
      .then((json) => {
        this.setAvailable();

        if (json.status === 'open' && this.status !== 'open') {
          this.setCapabilityValue('garagedoor_closed', false);
          this.setCapabilityValue('alarm_generic', true).catch((err) => this.log(err));
          this.setCapabilityValue('alarm_motion', false).catch((err) => this.log(err));
          this.status = 'open';
        } else if (json.status === 'closed' && this.status !== 'closed') {
          this.setCapabilityValue('garagedoor_closed', true);
          this.setCapabilityValue('alarm_generic', false).catch((err) => this.log(err));
          this.setCapabilityValue('alarm_motion', false).catch((err) => this.log(err));
          this.status = 'closed';
        } else if (json.status !== 'open' && json.status !== 'closed') {
          this.setCapabilityValue('alarm_motion', true).catch((err) => this.log(err));
        }

        this.status = json.status;
      })
      .catch((error) => {
        this.log('Did not recieve any response from garageport');
        this.setUnavailable('Did not recieve any response from garageport');
      });
  }

  /**
   * Commands the garageport
   */
  async runCommand(value) {
    const command = value === false ? 'open' : 'close';

    if (this.status === 'open' || this.status === 'closed') {
      fetch(`http://${this.address}:${this.port}/${command}`, { method: 'POST' })
        .then((res) => res.json())
        .then((json) => {
          this.setAvailable();
          this.log('Command sent:', command, 'status recieved:', json.status);

          if (json.status === 'error') {
            this.setWarning('Port is already moving...');
          } else if (command === 'open') {
            this.setCapabilityValue('alarm_motion', true).catch((err) => this.log(err));
            this.setCapabilityValue('alarm_generic', false).catch((err) => this.log(err));
            this.status = 'opening';
            setTimeout(() => {
              this.status = 'open';
              this.setCapabilityValue('alarm_motion', false).catch((err) => this.log(err));
              this.setCapabilityValue('alarm_generic', true).catch((err) => this.log(err));
            }, 18000);
          } else if (command === 'close') {
            this.setCapabilityValue('alarm_motion', true).catch((err) => this.log(err));
            this.setCapabilityValue('alarm_generic', false).catch((err) => this.log(err));
            this.status = 'closing';
            setTimeout(() => {
              this.status = 'closed';
              this.setCapabilityValue('alarm_motion', false).catch((err) => this.log(err));
              this.setCapabilityValue('alarm_generic', false).catch((err) => this.log(err));
            }, 18000);
          }
          setTimeout(() => {
            this.unsetWarning();
          }, 3000);
        })
        .catch((error) => {
          this.log('Failed commanding garageport');
          this.setUnavailable('Did not recieve any response from garageport');
        });
    } else {
      this.setWarning('Port is already moving...');
      setTimeout(() => {
        this.unsetWarning();
      }, 3000);
    }
  }

}

module.exports = Garageport;
