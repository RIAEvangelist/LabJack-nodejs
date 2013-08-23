var functionLocationList = require('./functionList');
var list = functionLocationList.getList();

var functionList = [];
results = [];
var device = null;
var driver;
var numTests = 0;


var startTime = 0;
var wait = false;
var runTime = 0;
var activeTest = 0;

testComplete = true;

var pRes = false;
var pCmd = false;

exports.config = function(dev, ljmDriver) {
	device = dev;
	driver = ljmDriver;
};

var nextStep = function() {
	activeTest++;
	wait=false;
};
var onSuccess = function(res) {
	results.push(res);
	if(pRes) {
		if(res != null) {
			console.log(res);
		} else {
			console.log('SUCCESS');
		}
	}
	nextStep();
};
var onError = function(erStr) {
	if(pRes) {
		console.log('ERROR: ',erStr);
	}
	results.push(erStr);
	nextStep();
};
var runTest = function() {
	var i;
	for(i = 0; i < numTests; i++) {
		var len = functionList[i].length;
		var funcArray = functionList[i].split('(');
		var funcName = funcArray[0]
		var output;
		if(funcName == 'close'); {
			runTime = Date.now() - startTime;
		}			

		
		if(pCmd) {
			console.log(list[funcName]+'.'+funcArray[0]+'Sync('+funcArray[1]);
		}
		//Execute test-function
		try
		{
			output = eval(list[funcName]+'.'+funcArray[0]+'Sync('+funcArray[1]);
		}
		catch (e)
		{
			console.log("Error",e);
		}
		onSuccess(output);
	}

	return {'time':runTime};

}

exports.run = function(testList, printResults, printCommands) {
	numTests = testList.length
	functionList = testList;
	testComplete = false;
	activeTest = 0;
	pRes = printResults;
	pCmd = printCommands;
	return runTest();
};

exports.getResults = function() {
	return results;
};