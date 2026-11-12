const {test}=require('node:test');
const assert=require('node:assert/strict');
const weather=import('../weather.mjs');
const now=Date.UTC(2026,10,12,12);
const payload=()=>({current_units:{temperature_2m:'°C'},current:{temperature_2m:23.4,weather_code:0,is_day:1,time:now/1000}});

test('temperature preference converts Celsius and Fahrenheit, including freezing and negative values',async()=>{
 const {formatTemperature}=await weather;
 assert.equal(formatTemperature(0,'celsius'),'0 °C');
 assert.equal(formatTemperature(0,'fahrenheit'),'32 °F');
 assert.equal(formatTemperature(-40,'fahrenheit'),'-40 °F');
 assert.equal(formatTemperature(23.4,'celsius'),'23 °C');
 assert.equal(formatTemperature(23.4,'fahrenheit'),'74 °F');
});

test('WMO weather conditions distinguish day and night, precipitation and unknown codes',async()=>{
 const {weatherCondition}=await weather;
 const day=weatherCondition(0,true,'es');const night=weatherCondition(0,false,'es');
 assert.ok(day.icon);assert.ok(day.text);assert.ok(night.text);assert.notEqual(day.icon,night.icon);
 for(const code of [1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99]){
  const value=weatherCondition(code,true,'es');assert.ok(value.icon,`icon for WMO ${code}`);assert.ok(value.text,`description for WMO ${code}`);
 }
 assert.notEqual(weatherCondition(61,true,'es').text,weatherCondition(61,true,'en').text);
 assert.ok(weatherCondition(123,true,'es').text);
});

test('current weather parses only numeric Celsius measurements with a recent valid time',async()=>{
 const {parseCurrentWeather}=await weather;const parsed=parseCurrentWeather(payload(),now);
 assert.equal(parsed.temperatureC,23.4);assert.equal(parsed.code,0);assert.equal(Boolean(parsed.isDay),true);assert.equal(parsed.observedAt,now);
 for(const value of [null,{}, {current:payload().current}, {...payload(),current_units:{temperature_2m:'°F'}}])assert.throws(()=>parseCurrentWeather(value,now));
 for(const [key,values]of Object.entries({temperature_2m:[null,'23',NaN,Infinity,-150,100],weather_code:[null,'0',NaN],is_day:[null,2],time:[null,'1760000000',NaN,(now-3600001)/1000,(now+900001)/1000]})){
  for(const value of values){const invalid=payload();invalid.current[key]=value;assert.throws(()=>parseCurrentWeather(invalid,now),`${key}: ${value}`);}
 }
 const freezing=payload();freezing.current.temperature_2m=0;assert.equal(parseCurrentWeather(freezing,now).temperatureC,0);
});
