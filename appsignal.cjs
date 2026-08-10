const { Appsignal } = require('@appsignal/nodejs')

const appsignal = new Appsignal({
  active: true,
  name: 'atendio',
})

module.exports = { appsignal }
