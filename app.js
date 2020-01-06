const express = require('express')
var bodyParser = require('body-parser')
const fs = require('fs')
var http = require('http');
var https = require('https');
var MongoClient = require('mongodb').MongoClient;
const { check, validationResult } = require('express-validator/check')
const { sanitizeBody } = require('express-validator/filter')
var mongoUrl = "mongodb://<user>:<password>@appfilter.net:<port>/admin"
const app = express()
const port = 80
app.set('view engine', 'pug')
app.use(bodyParser.urlencoded({extended: false}))

app.get('/', function(req,res)
{
	MongoClient.connect(mongoUrl, function (err, db) 
	{
		if (err) throw err
		var dbo = db.db("playstore")
		dbo.collection("appDetailsBeta").find().limit(50).sort({ratings:-1}).toArray(function(err,result)
		{
			if (err) throw err
			res.render('table',{data: result})
			db.close()
		})
	})
})

app.post('/', [sanitizeBody('title').whitelist(["a-zA-Z0-9 &"]), sanitizeBody('iap').whitelist(["a-zA-Z0-9 &"]), sanitizeBody('gpp').whitelist(["a-zA-Z0-9 &"]), sanitizeBody('ads').whitelist(["a-zA-Z0-9 &"]), sanitizeBody('cat').whitelist(["a-zA-Z0-9 &_"]), sanitizeBody('dev').whitelist(["a-zA-Z0-9 &"]), sanitizeBody('paid').whitelist(["a-zA-Z0-9 &"]), sanitizeBody('contentRating').whitelist(["a-zA-Z0-9 &"])], function(req,res)
{
	const errors = validationResult(req)
	if(!errors.isEmpty())
	{
		return res.status(422).json({ errors: errors.array() })
	}
	var datetime = new Date()
	
	console.log(req.body)
	
	var choiceTitle = req.body.title
	if (choiceTitle === '')
		choiceTitleQuery = {$exists:true}
	else
		choiceTitleQuery = new RegExp(choiceTitle, 'i')
	
	var choiceIap = req.body.iap.toLowerCase()
	if (choiceIap === '')
		choiceIapQuery = {$exists:true}
	else
		choiceIapQuery = choiceIap
	
	var choiceAds = req.body.ads.toLowerCase()
	if (choiceAds === '')
		choiceAdsQuery = {$exists:true}
	else
		choiceAdsQuery = choiceAds
	
	var choiceGpp = req.body.gpp.toLowerCase()
	if (choiceGpp === '')
		choiceGppQuery = {$exists:true}
	else
		choiceGppQuery = choiceGpp
	
	var choicePaid = req.body.paid.toLowerCase()
	if (choicePaid === 'no')
		choicePaidQuery = {$eq:0} 
	else if (choicePaid === 'yes')
		choicePaidQuery = {$ne:0}
	else
		choicePaidQuery = {$exists:true}
	
	var choiceCat = req.body.cat
	if (choiceCat === '')
		choiceCatQuery = {$exists:true}
	else
		choiceCatQuery = new RegExp(choiceCat, 'i')
	
	var choiceContent = req.body.contentRating
	if (choiceContent === '')
		choiceContentQuery = {$exists:true}
	else
		choiceContentQuery = new RegExp(choiceContent, 'i')
	
	var choiceDev = req.body.dev
	if (choiceDev === '')
		choiceDevQuery = {$exists:true}
	else
		choiceDevQuery = new RegExp(choiceDev, 'i')
	
	MongoClient.connect(mongoUrl, function (err, db) 
	{
		if (err) throw err
		var dbo = db.db("playstore")
		query = {'title':choiceTitleQuery, 'iap':choiceIapQuery, 'ads':choiceAdsQuery, 'playPass':choiceGppQuery, 'price':choicePaidQuery, 'category':choiceCatQuery, 'contentRating':choiceContentQuery, 'dev':choiceDevQuery}
		console.log(query)
		logQuery = {'time':datetime, 'ip':req.connection.remoteAddress, 'title':choiceTitle, 'iap':choiceIap, 'ads':choiceAds, 'gpp':choiceGpp, 'paid':choicePaid, 'cat':choiceCat,'contentRating':choiceContent,'dev':choiceDev}
		fs.writeFile('/root/playstore/logs/queries.txt', JSON.stringify(logQuery)+'\n', {flag:'a+'}, (err) =>
		{
			if (err)
			{
				console.error(error)
				return
			}
		})
		dbo.collection("appDetailsBeta").find(query).limit(1000).sort({ratings:-1}).toArray(function(err,result)
		{
			if (err) throw err
			res.render('table',{data:result, choices:req.body})
			db.close()
		})
	})
})

https.createServer({
  key: fs.readFileSync('/etc/letsencrypt/live/appfilter.net/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/appfilter.net/cert.pem')
}, app)
.listen(443, function () {
  console.log('app listening on port 443!')
})

http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(80);
//app.listen(port, () => console.log(`Example app listening on port ${port}!`))
