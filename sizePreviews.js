
// Size? Monitor
// Developed by: Carti

const fs = require('fs');
const colors = require('colors');
const cheerio = require('cheerio');
const dateFns = require('date-fns');
const logger = require('./classes/logger');
const proxyManager = require('./classes/proxyManager');
const request = require('request').defaults({
    timeout: 3000,
    gzip: true,
    forever: true,
    headers: {
        "origin": "https://size-mosaic-webapp.mesh.mx",
        "referer": "https://size-mosaic-webapp.mesh.mx/?channel=iphone-mosaic&appversion=2&buildversion=1.1.0.4",
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
    }
});


const config = JSON.parse(fs.readFileSync('./settings/config.json'));

class SizePreviews {


    constructor() {

        this.proxy = getProxy();
        this.apiKey = '0ce5f6f477676d95569067180bc4d46d';
        this.baseURL = 'https://mosaic-platform.mesh.mx';

        this.productTitle = '';
        this.productImage = '';
        this.productPrice = '';
        this.productLaunchDate = '';

        this.productID = '';
        this.sizeArray = [];
    }


    mainMonitor() {

        request({
            timeout: 10000,
            url: `${this.baseURL}/stores/size/content?api_key=${this.apiKey}&channel=iphone-mosaic`,
            proxy: this.proxy
        }, (err, resp, body) => {

            if (err || resp.statusCode != 200) {
                log(`[SizePreviews] : Error requesting product page...`, "error");
                this.proxy = getProxy();
                this.mainMonitor();
                return;
            }

            log(`[SizePreviews] : Monitoring product page...`, "info");


            const pageContent = JSON.parse(body);
            const productArray = pageContent.products;


            if (productArray.length === 0) {
                this.proxy = getProxy();
                this.mainMonitor();
                return;
            }


            const databaseFile = fs.readFileSync('./settings/database.txt').toString();


            productArray.forEach((product) => {

                this.productID = product.ID;

                if (!databaseFile.includes(this.productID)) {

                    log(`[SizePreviews] : Found Product! (${this.productID})`, "success", "database.txt");

                    this.productTitle = product.name;
                    this.productPrice = product.price.amount;
                    this.productLaunchDate = product.launchDate;
                    this.productImage = product.images[0].original;

                    this.sizeArray = product.options;
                    this.sendDiscord();
                    return;
                }

            });

            return this.mainMonitor();
        });
    };

    // Discord notif
    sendDiscord() {
        const webhookUrl = config.discordWebhook;
        const dateFormatted = dateFns.format(new Date(this.productLaunchDate), 'do MMM YY, hh:mm:ss A');

        let sizeString = ``;
        this.sizeArray.forEach((size) => {
            sizeString += `**${size.name}** ― ${size.optionID}\n`;
        });
        request({
            method: "POST",
            url: webhookUrl,
            headers: {"Content-Type": "application/json"},
            json: embed,
        }, (err, resp, body) => {


            if (err || resp.statusCode != 204) {
                log(`[SizePreviews] : Error!!`, "error");
                this.proxy = getProxy();
                this.mainMonitor();
                return;
            };


            log(`[SizePreviews] : Success!!`, "success");
            this.proxy = getProxy();
            this.mainMonitor();
            return;
        });
    };
}


function getProxy() {
    return new proxyManager().get_next_proxy();
}

function log(message, color, file = "") {
    return new logger().log(message, color, file);
};


new SizePreviews().mainMonitor();
