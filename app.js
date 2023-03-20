const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
const cookieParser=require('cookie-parser');

var session = require('express-session');


const app = express();
app.use(cookieParser())

const port = 6789;

// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set('view engine', 'ejs');
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);
// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static('public'))
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));


app.use(session({
	secret:'secret',
	resave:false,
	saveUninitialized:false,
	cookie:{
	maxAge:null
	}}));
// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'Hello World'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
//app.get('/', (req, res) => res.send('Hello World'));
app.get('/', (req, res) => {
	res.clearCookie('mesajEroare');
	var produse = null;
	if(req.cookies['produse'] != null){
		produse = req.cookies['produse'];
	}
	if(req.cookies["utilizator"]){
		res.render('index', {utilizator: req.cookies["utilizator"],
							
							produse: produse});
	}
	else{
		res.render('index', {utilizator : undefined,
							
							produse : undefined});
	}
		
});

// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
	
	let utilizator = req.session.numeLogat
	// în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
	res.render('chestionar', {intrebari: listaIntrebari,utilizator:utilizator});
});

const fs = require('fs');

var data = fs.readFileSync('intrebari.json');
listaIntrebari = JSON.parse(data);

app.post('/rezultat-chestionar', (req, res) => {
	console.log(req.body);
	fs.readFile('intrebari.json', (err, data) => {
		var nr = 0;
		var i = 0;
		for (i in req.body) {
			console.log(listaIntrebari[parseInt(i.substring(1))].corect);
			if (req.body[i] == listaIntrebari[parseInt(i.substring(1))].corect) {
				nr++;
			}
		}
		console.log('Corecte:' + nr);
		let utilizator = req.session.numeLogat;
		res.render('rezultat-chestionar', { raspunsuri: nr, utilizator: utilizator});
	});
});

app.get('/autentificare', (req, res) => {
	res.render('autentificare',{mesajEroare: req.cookies.mesajEroare, utilizator: null});
});

app.post('/verificare-autentificare', (req, res, next) => {
	fs.readFile('utilizatori.json',(err,data) => {
		
		if(err) throw err;
		console.log("Verificare Autentificare");
		console.log(req.body);
		
		var users=JSON.parse(data);
		var i=0;
		let ok=0;
		
		for(i in users.utilizatori) {
			if(req.body.unameN === users.utilizatori[i].user && req.body.pnameN === users.utilizatori[i].parola)
			{
				ok=1;
				req.session.rol = users.utilizatori[i].rol;
				
			}
			console.log(ok);
		}
		if(ok ==0){
			
			console.log("Numele utilizatorului sau parola sunt greșite!");
			
			res.cookie('mesajEroare','Numele utilizatorului sau parola sunt greșite!',{maxAge:1*60000});
			res.clearCookie("utilizator");
			res.redirect('/autentificare');
			
		}
		else{
			console.log("Autentificare corectă!");

			req.session.numeLogat = req.body.unameN;

			console.log(req.session.numeLogat);
		
			res.cookie('utilizator', req.body.unameN,{maxAge:2*60000});

			res.redirect("/");
		}
	});


});
app.get('/logout', (request, response, next) => {
    response.clearCookie('utilizator');
	request.session.destroy();
    response.redirect('/');
});


app.get('/creare-bd', (req, res) => {
	var mysql = require('mysql');

	var con = mysql.createConnection({
		host: "localhost",
		user: "root",
		password: "root"
	});

	con.connect(function (err, result) {
		if (err){
			console.log(err);
			console.log("Eroare la conectarea serverului bazei de date " + err.code);
			return;
		}
		console.log("Conexiune realizata cu succes!!!");
		con.query("CREATE DATABASE cumparaturi", function (err) {
			if (err){
				console.log("Eroare la crearea bazei de date " + err.code);
			}
			else{
				console.log("Baza de date a fost creata cu succes!!");
			}
			return;
		});

		var sql = "CREATE TABLE cumparaturi.produse (id INT AUTO_INCREMENT PRIMARY KEY, nume VARCHAR(255), specificatii VARCHAR(255))";
		con.query(sql, function (err, result) {
			if(err){
				if(err.code == 'ER_TABLE_EXISTS_ERROR'){
					console.log("Tabela deja exista!");
				}
				else{
					console.log("Eroare la crearea tabelei " + err.code);
				}
			}
			else{
				console.log("Tabela a fost creata cu succes!!");
			}
		});
	});

	res.redirect('/');
});


app.get('/inserare-bd', (req, res) => {

	var mysql = require('mysql');

	var dbConnectionpool = mysql.createPool({
		host: "localhost",
		user: "root",
		password: "root",
		database: "cumparaturi"
	});

	let products = [
		['Espresso cu Lapte (Mic) 150ml','5 lei'],
		['Espresso cu Lapte (Mare) 280ml','6 lei'],
		['Cappuccino 280ml','6 lei'],
		['Cappuccino Caramel 280ml','7 lei'],
		['Latte Macchiato 280ml','6  lei'],
		['Coconut Coffee 280mal','8 lei'],
		['Frape 330ml','8 lei'],
		['Milkshake	500ml','8 lei'],
		['Ciocolată caldă 280ml','7 lei']

	];

	dbConnectionpool.getConnection((err,dbConnection)=> {
		if (err) {
			console.log("Eroare la conectarea bazei de date " + err.code);
			return;
		}
		console.log("Conectarea realizata cu succes! (pt inserare)");
		var sqlBase = 'INSERT INTO cumparaturi.produse (nume, specificatii) VALUES';
		products.forEach(produs => {

			let sql = sqlBase + '(';
			sql +="'" + produs[0]+ "'" + ", ";
			sql +="'" + produs[1] + "'" + ')';
		
			dbConnection.query(sql,(err, result)=> {
				if (err) {
					if(err.code == 'ERR_DUP_ENTRY'){
						console.log("Inregistrarea exista deja");
					}
					else{
						console.log("Eroare la inserare! " + err.code);
					}
				}
				else{
					console.log("Inserare cu succes");
				}
				return;
		    });
		});
		dbConnection.release();
		return;
	});

	res.redirect('/');
});


app.get('/afisare-produse', (req, res) => {

	var mysql = require('mysql');

	var dbConnectionpool = mysql.createPool({
		host: "localhost",
		user: "root",
		password: "root",
		database: "cumparaturi"
	});

	dbConnectionpool.getConnection((err,dbConnection)=> {
		if (err) {
			console.log("Eroare la conectare! " + err.code);
			return;
		}
		console.log("Conectarea realizata cu succes! (pt afisare produse)");
		var sql = "SELECT * FROM produse";
		dbConnection.query(sql, function(err, result){
			if(err){
				console.log("Eroare la extragere date " + err.code);
			}
			else{
				console.log("Date extrase cu succes");
				res.cookie('produse', result);
				res.redirect('/');
			}
			return;
		});
		dbConnection.release();
	});
});

app.post('/adaugare-cos', (req, res) => {
	console.log("Incercam adaugarea produsului cu id [" + req.body.id + "] în coș!");
  
  if(req.session.cos_cumparaturi === undefined) {
  	req.session.cos_cumparaturi = [];
  }

	req.cookies['produse'].forEach(produs =>{
		if(produs.id == req.body.id){
			var status = false;
			var id=0;
			req.session.cos_cumparaturi.forEach(sessionProduct =>{
				if(sessionProduct.id == produs.id){
					//console.log('Produsul exista deja în coș!')
					req.session.cos_cumparaturi.push(produs);
					status = true;
				}
			});
		if(status == false){
			req.session.cos_cumparaturi.push(produs);
		}
	}

	});

	console.log(req.session.cos_cumparaturi);
	res.redirect('/');

});

app.get('/vizualizare-cos', (req, res) =>{
	let utilizator = req.session.numeLogat;
	res.render('vizualizare-cos', {produse:req.session.cos_cumparaturi, utilizator: utilizator});
});




//admin
app.get('/admin', (req, res) => {
	console.log(req.session.rol);
	if(req.session && req.session.rol === 'admin')
	{
		res.render('admin', { utilizator: "admin"});
	}
	else{
		res.redirect('/');
	}
});



app.post('/adaugare-produs', (req, res) => {
	var mysql = require('mysql');
	console.log('aici');
	var con = mysql.createConnection({
		host: "localhost",
		user: "root", 
		password: "root",
		database: "cumparaturi"
	});

	con.connect(function (err) {
		if (err){
			console.log(err);
			console.log("Eroare la conectarea serverului bazei de date\n");
			return;
		}
		console.log("Conectarea realizată cu succes!");
		console.log(req.body.nume);
		console.log(req.body.specificatii );
		var sql = 'INSERT INTO cumparaturi.produse (nume, specificatii) VALUES (' + req.body.nume + ',' + req.body.specificatii  + ')';

		con.query(sql, function (err, result) {
			if (err) {
				if(err.code == 'ERR_DUP_ENTRY'){
					console.log("Inregistrarea exista deja");
				}
				else{
					console.log("Eroare la inserare!" + err.code);
				}
			}
			else{
				console.log("Inserare cu succes");
			}
		});
	});
	res.redirect('/');
});

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`));

