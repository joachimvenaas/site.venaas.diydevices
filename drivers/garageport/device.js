'use strict';

const { Device } = require('homey');
const fetch = require('node-fetch');

class Garageport extends Device {

  status = 'unknown';
  address = this.getStoreValue('address');
  port = this.getStoreValue('port');
  intervalChecker = null;

  /**
   * On initialze device
   */
  async onInit() {
    this.log('Garageport device has been initialized');
    this.setCapabilityValue('alarm_motion', false).catch((err) => this.log(err));
    this.setCapabilityValue('alarm_generic', false).catch((err) => this.log(err));

    // Send command to garageport open/close
    this.registerCapabilityListener('garagedoor_closed', async (value) => this.runCommand(value));

    // Read value from external source
    this.getStatus();
    this.intervalManager(true);
  }

  /**
   * Read value from external source
   */
  async getStatus() {
    fetch(`http://${this.address}:${this.port}/`, { method: 'GET' })
      .then((res) => res.json())
      .then((json) => {
        this.setAvailable(); // Mark device as available

        // Result is "open" and latest current status is not "open"
        if (json.status === 'open' && this.status !== 'open') {
          this.setCapabilityValue('garagedoor_closed', false);
          this.setCapabilityValue('alarm_generic', true).catch((err) => this.log(err)); // Active port open alert
          this.setCapabilityValue('alarm_motion', false).catch((err) => this.log(err)); // Disable motion alert

        // Result is "closed" and current status is not "closed"
        } else if (json.status === 'closed' && this.status !== 'closed') {
          this.setCapabilityValue('garagedoor_closed', true);
          this.setCapabilityValue('alarm_generic', false).catch((err) => this.log(err)); // Disable port open alert
          this.setCapabilityValue('alarm_motion', false).catch((err) => this.log(err)); // Disable motion alert

        // Opening or closing
        } else if (json.status === 'opening' && json.status === 'closing') {
          this.setCapabilityValue('alarm_motion', true).catch((err) => this.log(err)); // Activate motion alert
        }

        // Update current status to result status
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

    this.intervalManager(false); // Stops current checking
    this.getStatus(); // Gets current status

    if (this.status === 'open' || this.status === 'closed') {
      fetch(`http://${this.address}:${this.port}/${command}`, { method: 'POST' })
        .then((res) => res.json())
        .then((json) => {
          this.setAvailable(); // Mark device as available
          this.log('Command sent:', command, 'status recieved:', json.status);

          // Error, in motion
          if (json.status === 'error') {
            this.setWarning('Port is already moving...');
            this.log('Port is already moving...');
            setTimeout(() => this.unsetWarning(), 3000); // Clears warning
            this.intervalManager(true); // Start interval checkin'

          // Open
          } else if (command === 'open') {
            this.setCapabilityValue('alarm_motion', true).catch((err) => this.log(err)); // Activate motion alert
            this.setCapabilityValue('alarm_generic', false).catch((err) => this.log(err)); // Disable open port alert
            this.status = 'opening';
            setTimeout(() => this.intervalManager(true), 20000); // Wait for 20 secs to restart interval checker

          // Close
          } else if (command === 'close') {
            this.setCapabilityValue('alarm_motion', true).catch((err) => this.log(err)); // Activate motion alert
            this.setCapabilityValue('alarm_generic', false).catch((err) => this.log(err)); // Disable open port alert
            this.status = 'closing';
            setTimeout(() => this.intervalManager(true), 20000); // Wait for 20 secs to restart interval checker
          }
        })
        .catch((error) => {
          this.log('Failed commanding garageport');
          this.setUnavailable('Failed sending command, did not recieve any response from garageport'); // Mark device as unavailable
          this.intervalManager(true); // Start interval checkin'
        });

    // Status is not "open" or "closed"
    } else {
      this.log('Port is already moving...');
      this.setWarning('Port is already moving...');
      setTimeout(() => this.unsetWarning(), 3000); // Clears warning
      this.intervalManager(true); // Start interval checkin'
    }
  }

  /**
   * Start and stop interval for status checker
   */
  async intervalManager(start) {
    if (start) {
      this.log('Started/restarted interval checker');
      this.intervalChecker = setInterval(() => this.getStatus(), 1000);
    } else {
      this.log('Cleared interval checker');
      clearInterval(this.intervalChecker);
    }
  }

}

module.exports = Garageport;
