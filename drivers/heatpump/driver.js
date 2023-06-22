'use strict';

const { Driver } = require('homey');

class HeatpumpDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Heatpump driver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    return [
      {
        name: 'Heatpump',
        data: {
          id: 'heatpump1',
        },
        store: {
          address: '192.168.1.7',
          port: '3000',
          target_temperature: 23,
          fan_speed: 1,
          thermostat_mode: 'off',
          power: 'off',
        },
      },
    ];
  }

}

module.exports = HeatpumpDriver;
