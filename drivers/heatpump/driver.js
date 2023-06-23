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
   * Pairing
   */
  async onPair(session) {
    let address = '';

    session.setHandler('ip_confirmed', async (ipView) => {
      address = ipView;

      if (!/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}:[0-9]{1,5}$/.test(address)) {
        this.log('Invalid ip/port provided');
        return false;
      }
      this.log('Valid address, pairing proceeding');
      return true;
    });

    session.setHandler('list_devices', async () => {
      const devices = [
        {
          name: 'Heatpump',
          data: {
            id: 'heatpump1',
          },
          store: {
            address: address.split(':')[0],
            port: address.split(':')[1],
            target_temperature: 23,
            fan_speed: 1,
            thermostat_mode: 'off',
            power: 'off',
          },
        },
      ];
      return devices;
    });
  }

}

module.exports = HeatpumpDriver;
