/**************************************************************************
 * 
 *  Haetaan visittampere.fi:sta tietoja.
 * 
 *  Komentorivi parametrit: 
 *  
 *      main.js -t <'type'> -l <limit>
 *  
 *      , jossa <type> on event tai article' 
 *      ja <limit> on haettavien yksikköjen määrä.
 *  
 ***************************************************************************/

/*
 * Globaalit muuttujat
 */
var unirest = require('unirest');
var conn; // connection global muuttuja
var coll; // collection global muuttuja 
var MongoClient = require('mongodb').MongoClient;
var OId = require('mongodb').ObjectID;
//var rsync = require('readline-sync');
var uusia = 0;
var paivitetty = 0;
var tyyppi = 'event';
var montako = 1000; 



if (process.argv.indexOf("-t") !== -1) {
    tyyppi = process.argv[process.argv.indexOf("-t") + 1];
}

if (process.argv.indexOf("-l") !== -1) {
    montako = process.argv[process.argv.indexOf("-l") + 1];
}
/*
if (process.argv.length !== 6) {
    console.log('usage: main.js -t <\'haettava tyyppi\'> -l <limit>, jossa <limit> on numero');
    process.exit(1);
}
*/



/************************************************************************
 * 
 * Tietokantayhteys
 * 
 *************************************************************************/
MongoClient.connect("mongodb://127.0.0.1:8383/eventflix", function (err, db) {

    if (err) {
        console.log("virhe: ei tietokantayhteyttä");
        process.exit(0);
    } else {
        conn = db;
        coll = db.collection("cards");
        console.log("tietokantayhteys ja collections ok!");
    }
});


function parsiKentat(tiedot) {

    //console.log('event: ' + tiedot.title);
    // console.log('scr: ' + JSON.stringify(tiedot.image));

    var card = {
        //_id: new OId(), 
        item_id: tiedot.item_id,
        lang: tiedot.lang,
        title: tiedot.title,
        description: tiedot.description,
        vendor_name: tiedot.contact_info.link,
        created_at: tiedot.created_at,
        updated_at: tiedot.updated_at,
        image: tiedot.image,
        type: tiedot.type,
        tags: tiedot.tags,
        form_contact_info: tiedot.form_contact_info
    };

    addToDatabase(card);
}

function lisaaKortti(kortti) {
    /*
     * 
     * @param {card}
     * @returns {undefined}
     * 
     * Lisätään uusi kortti tietokantaan.
     * 
     */
    //console.log('lisätään uusi kortti kantaan: ' + JSON.stringify(kortti));
    coll.insert(
            kortti,
            function (err, result) {

                if (err)
                    console.log('error: ' + err);

                //console.log('result: ' + JSON.stringify(result));



            }
    );
    uusia++;
}

function paivitaKortti(id, kortti) {
    /*
     * 
     * @param {card, _id}
     * @returns {undefined}
     * 
     * Päivitetään Mongo ObjectID:n mukainen tietue kannassa. 
     * 
     */
    //console.log('päivitetään kortti id:lle: ' + id);

    coll.update(
            {"_id": id}, // query
            {$set: kortti}, // replacement
    //{}, // options
            function (err, result) { // callback function

                if (err)
                    console.log('error: ' + err);

                //console.log('result: ' + JSON.stringify(result));

            });
    paivitetty++;
}
function addToDatabase(uusi) {
    /*
     * ensin tarkistetaan löytyykö samalla item_id:llä olio kannasta
     * jos ei löydy, niin olio lisätään uutena kantaan.
     * jos löytyy, niin olemassa olevaa oliota päivitetään
     * 
     */

    coll.find(
            {"item_id": uusi.item_id}
    ).toArray(
            function (err, result) {

                if (result.length === 0) {
                    lisaaKortti(uusi);
                } else {

                    // jos item_id löytyi, otetaan vastauksesta 
                    // MongoDB:n ObjectID talteen
                    var _id = result[0]._id; 
                    //console.log('_id: ' + _id);
                    paivitaKortti(_id, uusi);
                }
                console.log('uusia kortteja lisätty: ' + uusia);
                console.log('kortteja päivitetty: ' + paivitetty);
            });

}

unirest.get('http://visittampere.fi/api/search')
        .query({'type': tyyppi, 'limit': montako})
        .end(function (res) {

            if (res.error) {
                console.log('GET error', res.error);
            } else {
                // tallennetaan hakutulos 
                var haetut = res.body;
                // console.log('tulos: ' +  JSON.stringify(haetut));
                var kpl = haetut.length;
                //console.log('korttien määrä: ' + kpl);

                for (var i = 0; i < kpl; i++) {

                    parsiKentat(haetut[i]);

                }

            }

        });
