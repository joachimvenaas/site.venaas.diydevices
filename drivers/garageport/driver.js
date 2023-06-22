'use strict';

const { Driver } = require('homey');

class GarageportDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Garageport driver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    return [
      {
        name: 'Garageport',
        data: {
          id: 'garageport1',
        },
        store: {
          address: '192.168.1.11',
          port: '3000',
        },
      },
    ];
  }

}

module.exports = GarageportDriver;
