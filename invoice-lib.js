exports.convert = function(query, fornitoreData, map){
    return {
        "FatturaElettronicaHeader": getHeader(query, fornitoreData, map),
        "FatturaElettronicaBody": getBody(query, map)
    };
};

const _ = {
    get: function(target, name, defaultValue) {
        return target.hasOwnProperty(name) ? target[name] : defaultValue;
    }
};

function getHeader(query, fornitore, map){
    let oneItem = query[0];
    let codiceDestinatario = txt(_.get(oneItem, map.CessionarioCommittente.IdCodice, "0000000"));
    let pec = _.get(oneItem, map.CessionarioCommittente.PEC, "");
    let header = {
        "DatiTrasmissione": {
            "IdTrasmittente": {
                "IdPaese":txt(fornitore.IdPaese),
                "IdCodice":txt(fornitore.IdTrasmittente)
            },
            "ProgressivoInvio": txt(getId(_.get(oneItem, map.IdFattura, 1), 5)),
            "FormatoTrasmissione":"FPR12",
            "CodiceDestinatario": codiceDestinatario
        },
        "CedentePrestatore":{
            "DatiAnagrafici":{
                "IdFiscaleIVA": {
                    "IdPaese":txt(fornitore.IdPaese),
                    "IdCodice":txt(fornitore.IdCodice)
                },
                "Anagrafica":{
                    "Denominazione":txt(fornitore.Denominazione)
                },
                "RegimeFiscale":txt(fornitore.RegimeFiscale)
            },
            "Sede":{
                "Indirizzo": txt(fornitore.Indirizzo),
                "CAP": txt(fornitore.CAP),
                "Comune": txt(fornitore.Comune),
                "Provincia":txt(fornitore.Provincia),
                "Nazione":txt("IT")
            },
            "IscrizioneREA":{
                "Ufficio":txt(fornitore.IscrizioneREA.Ufficio),
                "NumeroREA":txt(fornitore.IscrizioneREA.NumeroREA),
                "CapitaleSociale":txt(fornitore.IscrizioneREA.CapitaleSociale),
                "SocioUnico":txt(fornitore.IscrizioneREA.SocioUnico),
                "StatoLiquidazione":txt(fornitore.IscrizioneREA.StatoLiquidazione)
            }
        },
        "CessionarioCommittente":{
            "DatiAnagrafici":{
                "Anagrafica":{
                    "Denominazione":txt(_.get(oneItem, map.CessionarioCommittente.Denominazione, ""))
                }
            },
            "Sede":{
                "Indirizzo": txt(_.get(oneItem, map.CessionarioCommittente.Indirizzo, "")),
                "CAP": txt(_.get(oneItem, map.CessionarioCommittente.CAP, "")),
                "Comune": txt(_.get(oneItem, map.CessionarioCommittente.Comune, "")),
                "Provincia":txt(_.get(oneItem, map.CessionarioCommittente.Provincia, "")),
                "Nazione":txt("IT")
            }
        }
    };

    if (pec !== "")  header.DatiTrasmissione.PECDestinatario = pec;

    let paese = "IT";
    let pIva = _.get(oneItem, map.CessionarioCommittente.IdFiscaleIVACodice, "");
    let cf = _.get(oneItem, map.CessionarioCommittente.CodiceFiscale, "");
    if(cf === ""){
        let idFiscaleIva= {IdPaese: paese, IdCodice: pIva};
        header.CessionarioCommittente.DatiAnagrafici = {
            IdFiscaleIVA: idFiscaleIva,
            Anagrafica: header.CessionarioCommittente.DatiAnagrafici.Anagrafica
        };
    } else  header.CessionarioCommittente.DatiAnagrafici = {
        CodiceFiscale: cf,
        Anagrafica: header.CessionarioCommittente.DatiAnagrafici.Anagrafica
    };

    return header
}

function getDatiGenerali(query, map) {
 return {
    "DatiGeneraliDocumento": getDatiGeneraliDocumento(query,map)
 };
}

function getDatiGeneraliDocumento(query, map){
    let oneItem = query[0];
    let res = {
        "TipoDocumento": txt(_.get(oneItem, map.DatiGeneraliDocumento.TipoDocumento, "TD01")), //Controllare se nota di credito, debito etc..
        "Divisa":txt("EUR"),
        "Data":txt(stringDateToDate(_.get(oneItem, map.DatiGeneraliDocumento.Data, "")) ),
        "Numero":txt(_.get(oneItem, map.DatiGeneraliDocumento.Numero, "1"))
    };
    return res;
}

function getBody(query, map) {
    let oneItem = query[0];
    let bs = getDatiBeniServizi(query, map);
    let dg = getDatiGenerali(query, map);
    let importoTotale = parseFloat(bs.bs.DatiRiepilogo.ImponibileImporto._text) + parseFloat(bs.bs.DatiRiepilogo.Imposta._text);
    if(bs.ddt.length >0 && bs.ddt[0].NumeroDDT !== "0" ) dg.DatiDDT = bs.ddt;
    let r = {
        "DatiGenerali":dg,
        "DatiBeniServizi":bs.bs,
        "DatiPagamento": getDatiPagamento(query, map, importoTotale)
    };
    r.DatiGenerali.DatiGeneraliDocumento.ImportoTotaleDocumento = txt(importoTotale.toFixed(2));
    addIfNotBlank(r.DatiGenerali.DatiGeneraliDocumento, "Causale", _.get(oneItem, map.DatiGeneraliDocumento.Causale, ""));
    return r;
}

function getDettaglioBene(rowQuery, map) {
    let quantita = parseFloat(_.get(rowQuery, map.DatiBeniServizi.Quantita, 0).replace(",", ".")).toFixed(2);
    let prezzoUnitario = parseFloat(_.get(rowQuery, map.DatiBeniServizi.PrezzoUnitario, 0).replace(",", ".")).toFixed(2);
    let prezzoTotale = parseFloat(quantita*prezzoUnitario).toFixed(2);
    let aliquota = parseFloat(_.get(rowQuery, map.DatiBeniServizi.AliquotaIVA, "22").replace(",", ".")).toFixed(2);
    let nddt = _.get(rowQuery, map.DatiDDT.NumeroDDT, "");
    let ddtData = _.get(rowQuery, map.DatiDDT.DataDDT, "");
    let r = {
        "NumeroLinea": 0,
        "Descrizione":txt(_.get(rowQuery, map.DatiBeniServizi.Descrizione, "") + " " + _.get(rowQuery, map.DatiBeniServizi.ItemDDTDescrizione, "")),
        "Quantita":txt(quantita),
        "UnitaMisura":txt(_.get(rowQuery, map.DatiBeniServizi.UnitaMisura, "")),
        "PrezzoUnitario":txt(prezzoUnitario),
        "PrezzoTotale":txt(prezzoTotale),
        "AliquotaIVA":txt(aliquota)
    };
    if(map.withConai) r.AltriDatiGestionali = {
        "TipoDato":"COMMENTO",
        "RiferimentoTesto":"CONTRIBUTO CONAI ASSOLTO"
    };
    return {"r":r, "p":prezzoTotale, "a":aliquota, "ddt": nddt, "ddtData": ddtData};
}

function getDatiBeniServizi(query, map) {
    let imponibileTot = 0;
    let impostaTot = 0;
    let aliquotaTot = 0;

    let beni = query.map((row,index) => {
        let el = getDettaglioBene(row, map);
        el.r.NumeroLinea = txt(index+1);
        return el;
    });

    let rows = beni.map((r) => {return r.r});

    beni.forEach((value) => {
        imponibileTot = parseFloat(imponibileTot) + parseFloat(value.p);
        let impostaItem = (parseFloat(value.p)/100) * parseFloat(value.a).toFixed(2);
        impostaTot = parseFloat(impostaTot) + impostaItem;
        aliquotaTot = value.a;
    });

    let aliquota = aliquotaTot;
    let imponibile = imponibileTot;
    let imposta = impostaTot.toFixed(2);

    let ddt = [];

    let haveDtt = beni.find((a) => {return a.ddt !== 0}) !== null;

    if(haveDtt){
        ddt = beni.map((v) => {
            return { NumeroDDT: v.ddt, DataDDT: stringDateToDate(v.ddtData), RiferimentoNumeroLinea: v.r.NumeroLinea }
        });
        let distinctNumDdt = new Set(ddt.map((v) => {return v.NumeroDDT})).size;
        if(distinctNumDdt === 1) ddt = [{NumeroDDT: ddt[0].NumeroDDT, DataDDT: ddt[0].DataDDT}]
    }

    return {
        bs: {
            "DettaglioLinee": rows,
            "DatiRiepilogo":{
                "AliquotaIVA":txt(aliquota),
                "ImponibileImporto":txt(imponibile.toFixed(2)),
                "Imposta":txt(imposta),
                "EsigibilitaIVA":txt("I")
            }
        },
        ddt: ddt
    }
}

function getDatiPagamento(query, map,  importo){
    let oneItem = query[0];
    let el =  {
        "CondizioniPagamento": "TP02",
        "DettaglioPagamento": {
            "ModalitaPagamento":txt(_.get(oneItem, map.DatiPagamento.ModalitaPagamento, "MP01")), // fix this
            "DataScadenzaPagamento":txt(stringDateToDate(_.get(oneItem, map.DatiPagamento.DataScadenzaPagamento, ""))),
            "ImportoPagamento": importo.toFixed(2)
        }
    };
    addIfNotBlank(el.DettaglioPagamento, "IBAN", _.get(oneItem, map.DatiPagamento.IBAN, ""));
    addIfNotBlank(el.DettaglioPagamento, "ABI", _.get(oneItem, map.DatiPagamento.ABI, ""));
    addIfNotBlank(el.DettaglioPagamento, "CAB", _.get(oneItem, map.DatiPagamento.CAB, ""));
    addIfNotBlank(el.DettaglioPagamento, "BIC", _.get(oneItem, map.DatiPagamento.BIC, ""));

    return el;
}

function txt(string) {
    return {"_text": string};
}

function stringDateToDate(string) {
    let arr = string.split("/");
    let year = "20" + arr[2];
    return year + "-" + getId(arr[0], 2)+"-"+getId(arr[1], 2);
}

function getId(baseId, ciper) {
    let numberOfCipher = baseId.toString().length;
    return "0".repeat(ciper-numberOfCipher).concat(baseId.toString());
}

function addIfNotBlank(obj, field, value) {
    if(value !== "") obj[field] = txt(value)
}