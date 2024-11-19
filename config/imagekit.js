// config/imagekit.js
const ImageKit = require('imagekit');

const imagekit = new ImageKit({
    publicKey: 'public_qJ8+hlcNBgMC0A/kiDfH7Vtv88o=',
    privateKey: 'private_AQIvghc0W3UJgmRbBu2X55VyJas=',
    urlEndpoint: 'https://ik.imagekit.io/i78loypjeo' // Replace with your ImageKit URL endpoint
});

module.exports = imagekit;
