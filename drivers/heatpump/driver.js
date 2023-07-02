'use strict';

const { Driver } = require('homey');

class HeatpumpDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Heatpump driver has been initialized');

    // Set Fan speed Flow card
    const fanSpeedFlowCard = this.homey.flow.getActionCard('set-fan-speed');
    fanSpeedFlowCard.registerRunListener(async (args) => {
      await args.device.sendCommand('flow', args.speed, 'flow');
    });

    // Set everything flow card
    const setAllFlowCard = this.homey.flow.getActionCard('set-all');
    setAllFlowCard.registerRunListener(async (args) => {
      this.log('Set all flow card!');
      await args.device.sendCommand(args.mode, args.speed, args.temp);
    });

    // Temperature is above/below card
    const temperatureIsAboveCard = this.homey.flow.getConditionCard('temperature-is-above');
    temperatureIsAboveCard.registerRunListener(async (args) => {
      if (args.device.getStoreValue('measure_temperature') > args.temp) {
        return true;
      }
      return false;
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
          name: 'Heatpump',
          data: {
            id: 'heatpump1',
          },
          store: {
            address: address.split(':')[0],
            port: address.split(':')[1],
            target_temperature: 23,
            fan_speed: 'low',
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
