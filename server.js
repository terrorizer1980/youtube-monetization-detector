// server.js
const express = require('express');
const puppeteer = require('puppeteer');
const request_client = require('request-promise-native');


const app = express();

// /?url=https://google.com
app.get('/', async (req, res) => {
	const {url} = req.query;
	if (!url || url.length === 0) {
		return res.json({error: 'url query parameter is required'});
	}

	const imageData = await Screenshot(url);

	res.set('Content-Type', 'image/jpeg');
	res.set('Content-Length', imageData.length);
	res.send(imageData);
});

app.listen(process.env.PORT || 3000);

async function Screenshot(url) {
	console.log("-------------START-------------")

	const browser = await puppeteer.launch({
		headless: true,
		executablePath: '/usr/bin/chromium-browser',
		args: [
			"--no-sandbox",
			"--disable-gpu",
		]
	});

	const page = await browser.newPage();

	await page.setRequestInterception(true);

	// Capture requests...
	// https://stackoverflow.com/questions/52969381/how-can-i-capture-all-network-requests-and-full-response-data-when-loading-a-pag
	const requestedUrls = [];
	page.on('request', request => {
		request_client({
			uri: request.url(),
			resolveWithFullResponse: true,
		}).then(response => {
			const request_url = request.url();
			// const request_headers = request.headers();
			// const request_post_data = request.postData();
			// const response_headers = response.headers;
			// const response_size = response_headers['content-length'];
			// const response_body = response.body;

			requestedUrls.push(request_url);

			// result.push({
			// 	request_url,
			// 	request_headers,
			// 	request_post_data,
			// 	response_headers,
			// 	response_size,
			// 	response_body,
			// });
			request.continue();
		}).catch(error => {
			//console.error(error);
			request.abort();
		});
	});

	await page.goto(url, {
		timeout: 0,
		waitUntil: 'networkidle0',
	});

	const screenData = await page.screenshot({encoding: 'binary', type: 'jpeg', quality: 30});

	await page.close();
	await browser.close();

	// web requests that happened
	//return result;

	// get_midroll_info
	// pagead2.googlesyndication.com
	// encoded_ad_playback_context
	// www.youtube.com/pagead/paralleladview
	// googleads.g.doubleclick.net/pagead/adview
	// www.youtube.com/pagead/conversion
	indicators = {
		"get_midroll_info": false,
		"pagead2.googlesyndication.com": false,
		"encoded_ad_playback_context": false,
		"www.youtube.com/pagead/paralleladview": false,
		"googleads.g.doubleclick.net/pagead/adview": false,
		"www.youtube.com/pagead/conversion": false,
	};

	requestedUrls.forEach((url) => {
		if(
			!url.includes("googlevideo.com/videoplayback") &&
			!url.includes("//fonts.") &&
			!url.includes("www.youtube.com/yts/cssbin") &&
			!url.includes("www.youtube.com/yts/jsbin") &&
			!url.includes("www.youtube.com/api/stats") &&
			!url.includes("www.youtube.com/s/player") &&
			!url.includes("error_204") &&
			!url.includes("generate_204") &&
			( url.includes("ad") || url.includes("doubleclick") )
		) {
			for( var indicatorName in indicators ) {
				if( url.includes(indicatorName) ) {
					indicators[indicatorName] = true;
				}
			}
		}
	})

	console.log("Indicators that video is monetized / has adverts on it...")
	console.log("")
	console.log(indicators)
	console.log("")
	yesIndicators = 0;
	for( var indicatorName in indicators ) {
		if(indicators[indicatorName]) {
			console.log("YES: " + indicatorName )
			yesIndicators++;
		} else {
			console.log("No:  " + indicatorName )
		}
	}
	console.log("")
	console.log(yesIndicators + "/6 advertising indicators. " + yesIndicators/6*100 + "% chance of advertising... (probably? maybe?)")
	console.log("")
	console.log("-------------END-------------")

	// Binary data of an image
	// TODO output the screenshot AND the request data?!
	return screenData;
}
