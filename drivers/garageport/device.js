'use strict';

const { Device } = require('homey');
const fetch = require('node-fetch');

class Garageport extends Device {

  async onInit() {
    this.log('Garageport device has been initialized');
    const address = this.getStoreValue('address');
    const port = this.getStoreValue('port');
    let status = 'unknown';

    this.setCapabilityValue('alarm_motion', false).catch((err) => this.log(err));

    /**
     * Send command to garageport open/close
     * Set status to opening/closing while moving to prevent directional changes
     */
    this.registerCapabilityListener('garagedoor_closed', async (value) => {
      let command = '';
      if (value === false) {
        command = 'open';
      } else if (value === true) {
        command = 'close';
      }
      if (status === 'open' || status === 'closed') {
        fetch(`http://${address}:${port}/${command}`, { method: 'POST' })
          .then((res) => res.json())
          .then((json) => {
            this.setAvailable();
            this.log('Command sent:', command, 'status recieved:', json.status);

            if (json.status === 'error') {
              this.setWarning('Port is already moving...');
            } else if (command === 'open') {
              this.setCapabilityValue('alarm_motion', true).catch((err) => this.log(err));
              status = 'opening';
              setTimeout(() => {
                status = 'open';
                this.setCapabilityValue('alarm_motion', false).catch((err) => this.log(err));
              }, 18000);
            } else if (command === 'close') {
              this.setCapabilityValue('alarm_motion', true).catch((err) => this.log(err));
              status = 'closing';
              setTimeout(() => {
                status = 'closed';
                this.setCapabilityValue('alarm_motion', false).catch((err) => this.log(err));
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
    });

    /**
     * Read value from external source
     * Temporarily pause fetching while port is moving
     */
    setInterval(() => {
      if (status !== 'opening' && status !== 'closing') {
        fetch(`http://${address}:${port}/`, { method: 'GET' })
          .then((res) => res.json())
          .then((json) => {
            this.setAvailable();
            if (json.status === 'open') {
              this.setCapabilityValue('garagedoor_closed', false);
              status = 'open';
            } else if (json.status === 'closed') {
              this.setCapabilityValue('garagedoor_closed', true);
              status = 'closed';
            } else {
              status = json.status;
            }
          })
          .catch((error) => {
            this.log('Did not recieve any response from garageport');
            this.setUnavailable('Did not recieve any response from garageport');
          });
      }
    }, 1000);
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('Garageport has been added');
  }

}

module.exports = Garageport;
