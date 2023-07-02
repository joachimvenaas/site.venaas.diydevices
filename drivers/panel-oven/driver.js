/* eslint-disable object-shorthand */

'use strict';

const { Driver } = require('homey');

class PanelOvenDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('MyDriver has been initialized');

    // Temperature is above/below card
    const temperatureIsAboveCard = this.homey.flow.getConditionCard('temperature-is-above-panel-oven');
    temperatureIsAboveCard.registerRunListener(async (args) => {
      if (args.device.getCapabilityValue('measure_temperature') > args.temp) {
        return true;
      }
      return false;
    });
  }

  /**
   * Pairing
   */
  async onPair(session) {
    let username = '';
    let password = '';

    session.setHandler('form_confirmed', async (formData) => {
      username = formData.split('_')[0];
      password = formData.split('_')[1];

      if (!/^[0-9]{1,7}$/.test(username)) {
        this.log('Invalid account id provided');
        return false;
      }
      if (!/^[A-z0-9]{1,32}$/.test(password)) {
        this.log('Invalid client secret provided');
        return false;
      }
      this.log('Valid, pairing proceeding');
      return true;
    });

    session.setHandler('list_devices', async () => {
      const devices = [
        {
          name: 'Panel oven',
          data: {
            id: 'panel-oven1',
          },
          store: {
            username: username,
            password: password,
          },
        },
      ];
      return devices;
    });
  }

}

module.exports = PanelOvenDriver;
