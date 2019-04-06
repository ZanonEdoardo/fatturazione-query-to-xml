# invoice-export-to-xml
Super simple parser for electronic-invoice (Italian-schema)
Only some feature are implemented, you can see in map.json what field are parsed.

You can create an electronic invoice from `.csv` or from `.xlxs`


## Configuration
The only operation required is configure:
- `config -> map.json` with your export query map 
- `config -> config.json` with your in-out and backup path. 
- `config -> supplier.json` fill the supplier configuration

## Requirements: 
- `Node.js` and `npm`

## How to run

The first time run in your shell or cmd: 
```
    npm install
```
For start run in your shell or cmd:
```
    npm start
```

