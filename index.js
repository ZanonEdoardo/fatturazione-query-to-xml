// LIB
const convert = require('xml-js');
const fs = require('fs');
const fatturaLib = require('./invoice-lib.js');
const sheetToJson = require('csv-xlsx-to-json');

// CONFIGURATION
const config = require('./config/config.json');
const map = require('./config/map.json');
const supplier = require('./config/supplier.json');

// INPUT FILE (TO BE DYNAMIC)
let workingDir = config.workingDir;
let outDir = config.outDir;
let backupDir = config.backupDir;
let outputFileName = config.outnamefile;


// MAIN
function main(inputFile){
    let query = sheetToJson.process(inputFile, function(err, result){
        if(err){
            console.error(err);
        } else {
            let cv = convertFatture(result);
            let outFile = outDir + "/" + outputFileName.concat("_").concat(cv.FatturaElettronicaHeader.DatiTrasmissione.ProgressivoInvio._text).concat(".xml");
            let xml = convertIntoXml(cv);
            writeFile(xml, outFile);
        }
    });
}

// FUNCTION

function convertIntoXml(fattura) {
    let options = {compact: true, ignoreComment: true, spaces: 4};
    let result = convert.js2xml(fattura, options);
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
        + "<p:FatturaElettronica xmlns:p=\"http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2\" xmlns:ds=\"http://www.w3.org/2000/09/xmldsig#\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" versione=\"FPR12\" xsi:schemaLocation=\"http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd\">\n"
        + result + "</p:FatturaElettronica>";

}

function writeFile(xml, name) {
    fs.writeFile(name, xml, (err) => {
        if(err) return console.log(err); else console.log("The file was saved!");
    });
}

function convertFatture(fattura) {
    return fatturaLib.convert(fattura, supplier, map);
}

function handler(){
    fs.readdirSync(workingDir).forEach(file => {
        console.log(file);
        let inputFile = workingDir + "/" + file;
        let backup = backupDir + "/" + file;
        main(inputFile);
        fs.renameSync(inputFile, backup);
    });
}

setInterval(handler, 10*1000);
