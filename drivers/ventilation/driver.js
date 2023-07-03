'use strict';

const { Driver } = require('homey');

class VentilationDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('VentilationDriver has been initialized');

    // Set Fan speed Flow card
    const runVentilationCard = this.homey.flow.getActionCard('run-ventilation');
    runVentilationCard.registerRunListener(async (args) => {
      await args.device.sendCommand(args.speed);
    });
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
          name: 'Ventilation Fan',
          data: {
            id: 'ventilationfan1',
          },
          store: {
            address: address.split(':')[0],
            port: address.split(':')[1],
            fan_speed: '0',
          },
        },
      ];
      return devices;
    });
  }

}

module.exports = VentilationDriver;
