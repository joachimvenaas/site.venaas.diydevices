'use strict';

const Homey = require('homey');

class DIYDevices extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('DIY Devices has been initialized');
  }

}

module.exports = DIYDevices;
