'use strict';

const { Driver } = require('homey');

class MagicChargerDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('MagicChargerDriver has been initialized');
  }

  /**
   * Pairing
   */
  async onPair(session) {
    let address = '';
    let token = '';

    session.setHandler('form_confirmed', async (formData) => {
      address = formData.split('_')[0];
      token = formData.split('_')[1];

      this.log('Valid, pairing proceeding');
      return true;
    });

    session.setHandler('list_devices', async () => {
      const devices = [
        {
          name: 'Magic Charger',
          data: {
            id: `mc_${token}`,
          },
          store: {
            url: address,
            token: `Bearer ${token}`,
          },
        },
      ];
      return devices;
    });
  }

}

module.exports = MagicChargerDriver;
