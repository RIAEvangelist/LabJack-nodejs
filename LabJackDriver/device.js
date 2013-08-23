//NOT SURE IF THIS IS NEEDED
var driver_const = require('./driver_const');
var ref = require('ref');//http://tootallnate.github.io/ref/#types-double
var util = require('util');//
var driverLib = require('./driver_wrapper');
var ffi = require('ffi');//
//var ljm = require('./ljmDriver');
var fs = require('fs');//to load/save firmware
var http = require('http');//to download newest firmware versions form the internet


// For problems encountered while in driver DLL
function DriverOperationError(code)
{
	this.code = code;
};

// For problem with using this layer
function DriverInterfaceError(description)
{
	this.description = description;
};



/**
 * @constructor for a LabJack device in .js
 */
exports.labjack = function ()
{
	this.ljm = driverLib.getDriver();
	
	this.handle = null;
	this.deviceType = null;
	//this.ljmDriver = new ljm.ljmDriver();
	
	//console.log('!LJM_Version!'+this.ljmDriver.readLibrary('LJM_LIBRARY_VERSION'));

	//Saves the Constants object
	this.constants = driverLib.getConstants();
	//console.log("Constants:",this.constants.search);
	//console.log("dictionary Dump: "+ this.constants.getAddressInfo(0, 7, 1));
	this.constants.search(0);
	//this.constants.getAddressInfo(0);
	//this.constants.getSizeOfAddress(0);


//******************************************************************************
//************************* Opening A Device ***********************************
//******************************************************************************
	/**
	 * Opens a new devDriverInterfaceErrorice if it isn't already connected.
	 *
	 * @param {number/string} deviceType number from driver_const.js file.
	 * @param {number/string} connectionType number from driver_const.js file.
	 * @param {number/string} identifier that allows selective opening of a 
	 * 		device, either string IP address or number serialNumber.
	 * @param {function} onError function Callback for error-case.
	 * @param {function} onSuccess function Callback for success-case.
	 * @throws {Error} if there are any un-recoverable errors
	**/
	this.open = function(deviceType, connectionType, identifier, onError, onSuccess) {
		//Variables to save information to allowing for open(onError, onSuccess)
		var dt, ct, id;

		//Determine how open() was used
		if(arguments.length == 2) {
			//If there are two args, aka open(onError, onSuccess) call

			var argA = typeof(arguments[0]);
			var argB = typeof(arguments[1]);

			//Make sure the first two arg's are onError and onSuccess
			if((argA == "function") && (argB == "function")) {
				dt = "LJM_dtANY";
				ct = "LJM_ctANY";
				id = "LJM_idANY";
				onError = arguments[0];//move the onError function
				onSuccess = arguments[1];//move the onSuccess function
			} else {
				throw new DriverInterfaceError("Invalid Open Call");
			}
		}
		else if(arguments.length == 5) {
			//Save the various input parameters
			dt = deviceType;
			ct = connectionType;
			id = identifier;
		} else {
			throw new DriverInterfaceError("Invalid Open Call");
		}

		//Complete Asynchronous function-call,
		//Make sure we aren't already connected to a device
		if(this.handle == null) {
			//Create variables for the ffi call
			var aDeviceHandle = new ref.alloc(ref.types.int,1);
			var output;

			//Get the type's of the inputs
			var dtType = typeof(dt);
			var ctType = typeof(ct);
			var idType = typeof(id);

			var self = this;
			//Function for handling the ffi callback
			var handleResponse = function(err, res) {
				if (err) throw err;
				//Check for no errors
				if(res == 0) {
					//Save the handle & other information to the 
					//	device class
					self.handle = aDeviceHandle[0];
					self.deviceType = dt;
					self.connectionType = ct;
					self.identifier = id;
					onSuccess();
				} else {
					//Make sure that the handle, deviceType 
					//		& connectionType are still null
					self.handle = null;
					self.deviceType = null;
					self.connectionType = null;
					self.identifier = null;
					onError(res);
				}
			};

			//Determine which LJM function to call
			if((dtType=="number")&&(ctType=="number")&&(idType=="string")) {
				//call LJM_Open() using the ffi async call
				output = this.ljm.LJM_Open.async(
					dt, 
					ct, 
					id, 
					aDeviceHandle, 
					handleResponse
				);
			}
			else if((dtType=="string")&&(ctType=="string")&&(idType=="string"))
			{
				//call LJM_OpenS() using the ffi async call
				output = this.ljm.LJM_OpenS.async(
					dt, 
					ct, 
					id, 
					aDeviceHandle, 
					handleResponse
				);
			} else {
				//If there were no applicable LJM function calls, throw an error
				throw new DriverInterfaceError("Un-Handled Variable Types");
			}
		}
	}

	/**
	 * Opens a new devDriverInterfaceErrorice if it isn't already connected.
	 *
	 * @param {number/string} deviceType number from driver_const.js file.
	 * @param {number/string} connectionType number from driver_const.js file.
	 * @param {number/string} identifier that allows selective opening of a 
	 * 		device, either string IP address or number serialNumber.
	 * @return {number} 0 on success, LJM_ Error Number on error.
	 * @throws {DriverInterfaceError} If there is a driver wrapper-error
	 * @throws {DriverOperationError} If there is an LJM reported error
	**/
	this.openSync = function(deviceType, connectionType, identifier)
	{
		//Variables to save information to allowing for open()
		var dt, ct, id;

		//Determine how open() was used
		if(arguments.length == 0) {
			//If there are two args, aka open() call
			dt = "LJM_dtANY";
			ct = "LJM_ctANY";
			id = "LJM_idANY";
		} else if(arguments.length == 3) {
			//Save the various input parameters
			dt = deviceType;
			ct = connectionType;
			id = identifier;
		} else {
			throw new DriverInterfaceError("Invalid Open Call");
			return -1;
		}

		//Complete Synchronous function-call,
		//Make sure we aren't already connected to a device
		if(this.handle == null) {
			//Create variables for the ffi call
			var aDeviceHandle = new ref.alloc(ref.types.int,1);
			var output;

			//Get the type's of the inputs
			var dtType = typeof(dt);
			var ctType = typeof(ct);
			var idType = typeof(id);

			//Determine which LJM function to call
			if((dtType=="number")&&(ctType=="number")&&(idType=="string")) {
				//call LJM_Open() using the ffi async call
				output = this.ljm.LJM_Open.async(dt, ct, id, aDeviceHandle);
			}
			else if((dtType=="string")&&(ctType=="string")&&(idType=="string")) 
			{
				//call LJM_OpenS() using the ffi async call
				output = this.ljm.LJM_OpenS.async(dt, ct, id, aDeviceHandle);
			} else {
				//If there were no applicable LJM function calls, throw an error
				throw new DriverInterfaceError("Un-Handled Variable Types");
				return -1;
			}

			//Determine whether or not the Open call was successful
			if(output == 0) {
				//Save the handle & other information to the 
				//	device class
				this.handle = aDeviceHandle[0];
				this.deviceType = dt;
				this.connectionType = ct;
				this.identifier = id;
				return output;
			} else {
				//Make sure that the handle, deviceType 
				//		& connectionType are still null
				this.handle = null;
				this.deviceType = null;
				this.connectionType = null;
				this.identifier = null;

				//Report an error
				throw new DriverOperationError(output);
				return output;
			}
		} else {
			return driver_const.LJME_DEVICE_ALREADY_OPEN;
		}
	}

//******************************************************************************
//****************** Communicating With  A Device ******************************
//******************************************************************************
	/**
	 * Function retrieves various information about the currently open device.
	 * 
	 * @param {function} onError function Callback for error-case.
	 * 		Arg: {number} LJM_ Error Number.
	 * @param {function} onSuccess function Callback for success-case.
	 * 		Arg: {Dictionary} Device Info:
	 * 		{ 
	 * 			deviceType:{number}, 
	 * 			connectionType:{number}, 
	 * 			serialNumber:{number}, 
	 * 			ipAddress:{string}, 
	 * 			port:{number},
	 * 			maxBytesPerMB:{number} 
	 * 		}
	**/
	this.getHandleInfo = function(onError, onSuccess) {
		//Check to make sure a device has been opened
		if(this.checkStatus(onError)) { return 1;};

		var errorResult;

		var devT = ref.alloc('int', 1);
		var conT = ref.alloc('int', 1);
		var sN = ref.alloc('int', 1);
		var ipAddr = ref.alloc('int', 1);
		var port = ref.alloc('int', 1);
		var maxB = ref.alloc('int', 1);

		errorResult = this.ljm.LJM_GetHandleInfo.async(
			this.handle, 
			devT, 
			conT, 
			sN, 
			ipAddr, 
			port, 
			maxB, 
			function (err, res){
				if(err) throw err;
				if(res == 0)
				{
					var ipStr = "";
					ipStr += ipAddr.readUInt8(3).toString();
					ipStr += ".";
					ipStr += ipAddr.readUInt8(2).toString();
					ipStr += ".";
					ipStr += ipAddr.readUInt8(1).toString();
					ipStr += ".";
					ipStr += ipAddr.readUInt8(0).toString();
					onSuccess(
						{
							deviceType:devT.deref(),
							connectionType:conT.deref(),
							serialNumber:sN.deref(),
							ipAddress:ipStr,
							port:port.deref(),
							maxBytesPerMB:maxB.deref()
						}
					);
				}
				else
				{
					onError(res);
				}
			}
		);
		return errorResult;
	}
	/**
	 * Function retrieves various information about the currently open device.
	 * 
	 * @return {Dictionary/Number} 
	 * 		On Success: Dict of device info:
	 * 		{ 
	 * 			deviceType:{number}, 
	 * 			connectionType:{number}, 
	 * 			serialNumber:{number}, 
	 * 			ipAddress:{string}, 
	 * 			port:{number},
	 * 			maxBytesPerMB:{number} 
	 * 		}
	 * 		
	 * 		On Error: LJM_ Error Number.
	 * @throws {Error} Thrown if any errors are discovered.
	**/
	this.getHandleInfoSync = function() {
		//Check to make sure a device has been opened
		this.checkStatus();

		var errorResult;

		var devT = ref.alloc('int', 1);
		var conT = ref.alloc('int', 1);
		var sN = ref.alloc('int', 1);
		var ipAddr = ref.alloc('int', 1);
		var port = ref.alloc('int', 1);
		var maxB = ref.alloc('int', 1);

		//Perform device I/O Operation
		errorResult = this.ljm.LJM_GetHandleInfo(
			this.handle, 
			devT, 
			conT, 
			sN,
			ipAddr, 
			port, 
			maxB
		);
		
		//Check to see if there were any errors
		if(errorResult != 0)
		{
			throw new DriverOperationError(output);
			return errorResult;
		}
		var returnVariable = 
		{
			deviceType:devT.deref(),
			connectionType:conT.deref(),
			serialNumber:sN.deref(),
			ipAddress:ipAddr.deref(),
			port:port.deref(),
			maxBytesPerMB:maxB.deref()
		};
		return returnVariable;
	}

	/**
	 * Function performs an asynchronous LJM_ReadRaw function call with the LJM
	 * driver
	 * 
	 * @param  {number-array} data      an appropriately sized number array 
	 *         indicating how many bytes should be received from the LJM driver
	 * @param  {function} onError   function to be called when successful
	 * @param  {function} onSuccess function to be called when an error occurs
	 */
	this.readRaw = function(data, onError, onSuccess) {
		//Check to make sure a device has been opened
		if(this.checkStatus(onError)) { return 1;};

		//Make sure the data is valid
		if (data instanceof Array) {
			if (typeof(data[0]) != "number") {
				onError("Data is not a number array");
			}
		} else {
			onError("Data is not an array");
		}

		//Create a blank array for data to be saved to & returned
		var aData = new Buffer(data.length);
		aData.fill(0);

		errorResult = this.ljm.LJM_ReadRaw.async(
			this.handle, 
			aData, 
			data.length, 
			function (err, res){
				if(err) throw err;
				if(res == 0)
				{
					onSuccess(aData);
				}
				else
				{
					onError(res);
				}
		});
	}

	/**
	 * Function performs a synchronous LJM_ReadRaw function call with the LJM 
	 * driver
	 * 
	 * @param  {number-array} data      an appropriately sized number array 
	 *         indicating how many bytes should be received from the LJM driver
	 * @return {number-array}      Data returned from the LJM_ReadRaw function
	 * @throws {DriverInterfaceError} If input args aren't correct
	 * @throws {DriverOperationError} If an LJM error occurs
	 */
	this.readRawSync = function(data) {
		//Check to make sure a device has been opened
		this.checkStatus();

		//Make sure the data is valid, a number array
		if (data instanceof array) {
			if (typeof(data[0]) != "number") {
				throw new DriverInterfaceError("Data is not a number array");
				return -1;
			}
		} else {
			throw new DriverInterfaceError("Data is not an array");
			return -1;
		}

		//Create a blank array for data to be saved to & returned
		var aData = new Buffer(data.length);
		aData.fill(0);

		errorResult = this.ljm.LJM_ReadRaw(this.handle, aData, data.length);

		//Check for an error
		if(errorResult != 0)
		{
			throw new DriverOperationError(errorResult);
		}
		return aData;
	}
	
	/**
	 * Function reads a single modbus address
	 *
	 * @params {number/string} address or name that you wish to read
	 * @param {function} onError function Callback for error-case.
	 * 		Arg: {number} LJM_ Error Number.
	 * @param {function} onSuccess function Callback for success-case.
	 * 		Arg: {number/string} Result returned from LJM's:
	 * 		eReadName, eReadAddress, eReadNameString, or eReadAddressString
	**/
	/**
	 * Function asynchronously reads a single modbus address
	 * @param  {number/string} address   LJM-address or name that you wish to 
	 *                                   read
	 * @param  {number} onError   LJM-Error number
	 * @param  {number/string} onSuccess Data requested from the device
	 * @throws {DriverInterfaceError} If the input args aren't correct
	 */
	this.read = function(address, onError, onSuccess) {
		//Check to make sure a device has been opened
		if(this.checkStatus(onError)) { return 1;};

		var output;
		var addressNum = 0;
		
		var result = new ref.alloc('double',1);

		if (typeof(address) == "string") {
			var info = this.constants.getAddressInfo(address, 'R');
			if ((info.directionValid == 1) && (info.type != 98)) {
				//Perform a eReadName operation
				
				//Allocate space for a read value
				var result = new ref.alloc('double',1);
				this.ljm.LJM_eReadName.async(
					this.handle, 
					address, 
					result,
					function(err, res) {
						if(err) throw err;
						if(res == 0) {
							//Success
							onSuccess(result.deref());
						} else {
							//Error
							onError(res);
						}
					});
			} else if ((info.directionValid == 1) && (info.type == 98)) {
				//Perform a eReadNameString operation
				
				//Allocate space for the result
				var strBuffer = new Buffer(50);//max string size
				strBuffer.fill(0);
				this.ljm.LJM_eReadNameString.async(
					this.handle, 
					address, 
					strBuffer, 
					function(err, res) {
						if (err) throw err;
						if(res == 0) {
							//Calculate the length of the string
							var i=0;
							while(strBuffer[i] != 0) {
								i++;
							}
							onSuccess(strBuffer.toString('utf8',0,i));
						} else {
							onError(res);
						}
					}
				);
			} else {
				onError("Invalid Address");
			}
		} else if (typeof(address) == "number") {
			var info = this.constants.getAddressInfo(address, 'R');
			if ((info.directionValid == 1) && (info.type != 98)) {
				//Perform a eReadName operation
				
				//Allocate space for a read value
				var result = new ref.alloc('double',1);
				this.ljm.LJM_eReadAddress.async(
					this.handle, 
					address, 
					info.type, 
					result,
					function(err, res) {
						if(err) throw err;
						if(res == 0) {
							//Success
							//console.log(result);
							onSuccess(result.deref());
						} else {
							//Error
							onError(res);
						}
					});
			} else if ((info.directionValid == 1) && (info.type == 98)) {
				//Perform a eReadAddressString operation
				
				//Allocate space for the result
				var strBuffer = new Buffer(50);//max string size
				strBuffer.fill(0);

				this.ljm.LJM_eReadAddressString.async(
					this.handle, 
					address, 
					strBuffer, 
					function(err, res) {
						if (err) throw err;
						if(res == 0) {
							//Calculate the length of the string
							var i=0;
							while(strBuffer[i] != 0) {
								i++;
							}
							onSuccess(strBuffer.toString('utf8',0,i));
						} else {
							onError(res);
						}
					}
				);
			} else {
				onError("Invalid Address");
			}
		} else {
			onError("Invalid Arguments");
		}
	}
	
	/**
	 * Function synchronously reads a single modbus address
	 * @param  {number/string} address LJM-address or name that you wish to read
	 * @return {number/string}         Data retrieved from device or error code
	 * @throws {DriverInterfaceError} If input args aren't correct
	 * @throws {DriverOperationError} If an LJM error occurs
	 */
	this.readSync = function(address) {
		//Check to make sure a device has been opened
		this.checkStatus();

		var output;
		var addressNum = 0;
		var result;
		if (typeof(address) == "string") {
			var info = this.constants.getAddressInfo(address, 'R');
			if ((info.directionValid == 1) && (info.type != 98)) {
				//Perform a eReadName operation
				
				//Allocate space for a read value
				result = new ref.alloc('double',1);
				output = this.ljm.LJM_eReadName(this.handle, address, result);
				if(output == 0) {
					result = result.deref();
				}
			} else if ((info.directionValid == 1) && (info.type == 98)) {
				//Perform a eReadNameString operation
				
				//Allocate space for the result
				var strBuffer = new Buffer(50);//max string size
				strBuffer.fill(0);

				output = this.ljm.LJM_eReadNameString(
					this.handle, 
					address, 
					strBuffer
				);
				if(output == 0) {
					var i=0;
					while(strBuffer[i] != 0) {
						i++;
					}
					result = strBuffer.toString('utf8',0,i);
				}
			} else {
				throw new DriverInterfaceError("Invalid Address");
				return -1;
			}
		} else if (typeof(address) == "number") {
			var info = this.constants.getAddressInfo(address, 'R');
			if ((info.directionValid == 1) && (info.type != 98)) {
				//Perform a eReadName operation
				
				//Allocate space for a read value
				result = new ref.alloc('double',1);
				output = this.ljm.LJM_eReadAddress(
					this.handle, 
					address, 
					info.type, 
					result
				);
				if(output == 0) {
					result = result.deref();
				}

			} else if ((info.directionValid == 1) && (info.type == 98)) {
				//Perform a eReadNumberString operation
				
				//Allocate space for the result
				var strBuffer = new Buffer(50);//max string size
				strBuffer.fill(0);

				output = this.ljm.LJM_eReadAddressString(
					this.handle, 
					address, 
					strBuffer
				);
				if(output == 0) {
					var i=0;
					while(strBuffer[i] != 0) {
						i++;
					}
					result = strBuffer.toString('utf8',0,i);
				}
			} else {
				throw new DriverInterfaceError("Invalid Address");
				return -1;
			}
		} else {
			throw new DriverInterfaceError("Invalid Arguments");
			return -1;
		}
		if(output == 0)
		{
			return result;
		}
		else
		{
			throw new DriverOperationError(output);
			return output;
		}
	}

	//Code-base for the read function:
	/*
	this.read = function(address)
	{
		this.checkStatus();

		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var output;
		var addressNum = 0;
		
		var errorResult;
		var result = new ref.alloc('double',1);
		var r


		if((typeof(address))=="string")
		{
			var info = this.constants.getAddressInfo(address, 'R');
			if((info.directionValid == 1) && (info.type != 98))
			{
				if(useCallBacks)
				{
					var self = this;
					errorResult = this.driver.LJM_eReadName.async(this.handle, address, result, function(err, res) {
						if (err) throw err;
						//console.log("mycall returned: " + res + ", Value: " + result.deref());
						if(res == 0)
						{
							onSuccess(result.deref());
						}
						else
						{
							onError(res);
						}
					});
					return 0;
				}
				else
				{
					errorResult = this.driver.LJM_eReadName(this.handle, address, result);
				}
			}
			else if((info.directionValid == 1) && (info.type == 98))
			{
				if(useCallBacks)
				{
					errorResult = this.readS(address, onError, onSuccess);
					return 0;
				}
				else
				{
					return this.readS(address);
				}
			}
			else
			{
				if(useCallBacks)
				{
					onError("Invalid Address");
					return driver_const.LJME_INVALID_ADDRESS;
				}
				else
				{
					throw new DriverInterfaceError("Invalid address");
				}
			}
		}
		else if((typeof(address))=="number")
		{
			//Get information necessary about the address requested
			var info = this.constants.getAddressInfo(address, 'R');
			if((info.directionValid == 1) && (info.type != 98))//Check validity to cleanly report error
			{
				if(useCallBacks)
				{
					errorResult = this.driver.LJM_eReadAddress.async(this.handle, address, info.type, result, function(err, res) {
						if (err) throw err;
						if(res == 0)
						{
							onSuccess(result.deref());
						}
						else
						{
							onError(res);
						}
					});
					return 0;
				}
				else
				{
					errorResult = this.driver.LJM_eReadAddress(this.handle, address, info.type, result);
				}
			}
			else if((info.directionValid == 1) && (info.type == 98))
			{
				if(useCallBacks)
				{
					errorResult = this.readS(address, onError, onSuccess);
					return 0;
				}
				else
				{
					return this.readS(address);
				}
			}
			else
			{
				if(useCallBacks)
				{
					onError("Invalid Address");
					return driver_const.LJME_INVALID_ADDRESS;
				}
				else
				{
					throw new DriverInterfaceError("Invalid address");
				}
			}
		}
		else
		{
			//console.log('Address: ', address);
			throw new DriverInterfaceError("Invalid address type.");
		}
		//Check for an error from driver & throw error
		if(errorResult != 0)
		{
			throw new DriverOperationError(errorResult);
		}
		return result.deref();
	};
	*/

	
	this.readMany = function(addresses) {

	}
	/**
	 * Function reads from multiple modbus addresses
	 *
	 * @params {number} addresses that you wish to read
	 * @return {numbers} numbers that were read or appropriate error messages.
	 * 		NOTE: As long as the error messages are out of range +-10 this is ok.
	 */
	/*
	this.readMany = function(addresses)
	{
		this.checkStatus();

		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var length = addresses.length;

		var returnResults = Array();
		var results = new Buffer(8*length);
		var errors = new ref.alloc('int',1);
		errors[0]=0;

		var errorResult;

		if((typeof(addresses[0]))=="string")
		{
			//Create String Array for names
			var i;
			//var aNames = Array();
			//var aNames = new Buffer(ref.sizeof.pointer * length); //50(maximum str. length) * numAddresses
			//aNames[0] = new Buffer(addresses[0]);
			//aNames[1] = new Buffer(addresses[1]);

			//ref: http://tootallnate.github.io/ref/
			var aNames = new Buffer(8*length);
			for(i = 0; i < length; i++)
			{
				//console.log('Iteration: '+i);
				var buf = new Buffer(addresses[i].length+1);
				ref.writeCString(buf,0,addresses[i]);
				//console.log('Data: '+buf);
				ref.writePointer(aNames,i*8,buf);
			}
			
			//console.log('Length: '+addresses.length);
			//console.log('Length: '+addresses[0].length);
			//console.log('Length: '+aNames.length);
			//console.log('Data: '+ ref.readPointer(aNames,0));
			
			//console.log('Length: '+ref.readPointer(aNames,0,8);
			//var t = new ffi.Array('string', length);
			//Copy Strings into buffer
			//for(i = 0; i < length; i++)
			//{
			//	aNames.writeUint32LE(addresses[i], i*4);
			//}
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eReadNames.async(this.handle, length, aNames, results, errors, function(err, res){
					if(err) throw err;
					var offset = 0;
					for(i in addresses)
					{
						returnResults[i] = results.readDoubleLE(offset);
						offset += 8;
					}
					if((res == 0))
					{
						onSuccess(returnResults);
					}
					else
					{
						onError({retError:res, errFrame:errors.deref()});
					}
				});
				return 0;
			}
			else
			{
				errorResult = this.driver.LJM_eReadNames(this.handle, length, aNames, results, errors);
			}
			

			//ref.refType('string'),			//aNames (Registers to read from)

		}
		else if((typeof(addresses[0]))=="number")
		{
			var addrBuff = new Buffer(4*length);
			var addrTypeBuff = new Buffer(4*length);
			var inValidOperation = 0;

			//Integer Returned by .dll function
			var info;
			var offset=0;
			i = 0;

			for(i = 0; i < length; i++)
			{
				info = this.constants.getAddressInfo(addresses[i], 'R');
				if(info.directionValid == 1)
				{
					addrTypeBuff.writeInt32LE(info.type,offset);
					addrBuff.writeInt32LE(addresses[i],offset);
					offset += 4;
				}
				else
				{
					if(useCallBacks)
					{
						onError("Invalid Address: "+addresses[i]+", Index: "+i);
						return driver_const.LJME_INVALID_ADDRESS;
					}
					else
					{
						throw new DriverInterfaceError("Invalid address");
					}
				}
			}
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eReadAddresses.async(this.handle, length, addrBuff, addrTypeBuff, results, errors, function(err, res){
					if(err) throw err;
					var offset = 0;
					for(i in addresses)
					{
						returnResults[i] = results.readDoubleLE(offset);
						offset += 8;
					}
					if((res == 0))
					{
						onSuccess(returnResults);
					}
					else
					{
						onError({retError:res, errFrame:errors.deref()});
					}
				});
				return 0;
			}
			else
			{
				//Perform Device I/O function
				errorResult = this.driver.LJM_eReadAddresses(this.handle, length, addrBuff, addrTypeBuff, results, errors);
			}
		}
		else
		{
			throw new DriverInterfaceError("Invalid address type.");
		}
		if(errorResult == 0)
		{
			//return Result
			var offset = 0;
			for(i in addresses)
			{
				returnResults[i] = results.readDoubleLE(offset);
				offset += 8;
			}
			return returnResults;
		}
		else
		{
			//return Error
			//throw new DriverOperationError(errorResult);
			return {retError:errorResult, errFrame:errors.deref()}
		}
	};
	*/

	/*
	this.writeRaw = function(data)
	{
		this.checkStatus();

		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;
		try
		{
			if(data[0] != "number")
			{
				return -1;
			}
		}
		catch (e)
		{
			return -1;
		}
		var aData = new Buffer(data.length);
		aData.fill(0);
		for(var i = 0; i < data.length; i++)
		{
			aData.writeUInt8(data[i], i);
		}

		if(useCallBacks)
		{
			errorResult = this.driver.LJM_WriteRaw.async(this.handle, aData, data.length, function (err, res){
				if(err) throw err;
				if(res == 0)
				{
					onSuccess(aData);
				}
				else
				{
					onError(res);
				}
			});
			return 0;
		}
		else
		{
			errorResult = this.driver.LJM_WriteRaw(this.handle, aData, data.length);
		}
		if(errorResult != 0)
		{
			return errorResult;
		}
		return 0;
	}
	*/
	/**
	 * Function writes to a single modbus address
	 *
	 * @params {number} address that you wish to read
	 * @params {number} value that you wish to write
	 * @return {number} number that was read or an error message
	 * 		NOTE: As long as the error messages are out of range +-10 this is ok.
	 */
	/*
	this.write = function(address, value)
	{
		this.checkStatus();
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;

		if((typeof(address))=="string")
		{
			var info = this.constants.getAddressInfo(address, 'W');
			if((info.directionValid == 1) && (info.type != 98))
			{
				if(useCallBacks)
				{
					errorResult = this.driver.LJM_eWriteName.async(this.handle, address, value, function(err, res){
						if(err) throw err;
						if(res == 0)
						{
							onSuccess();
						}
						else
						{
							onError(res);
						}
					});
					return 0;
				}
				else
				{
					errorResult = this.driver.LJM_eWriteName(this.handle, address, value);
				}
			}
			else if((info.directionValid == 1) && (info.type == 98))
			{
				if(useCallBacks)
				{
					errorResult = this.writeS(address, value, onError, onSuccess);
					return 0;
				}
				else
				{
					return this.writeS(address, value);
				}
			}
			else
			{
				if(useCallBacks)
				{
					onError("Invalid Address");
					return driver_const.LJME_INVALID_ADDRESS;
				}
				else
				{
					throw new DriverInterfaceError("Invalid address");
				}
			}
		}
		else if((typeof(address))=="number")
		{
			//Get information necessary type-info about the address requested
			var info = this.constants.getAddressInfo(address, 'W');
			if((info.directionValid == 1) && (info.type != 98))
			{
				if(useCallBacks)
				{
					errorResult = this.driver.LJM_eWriteAddress.async(this.handle, address, info.type, value, function(err, res){
						if(err) throw err;
						if(res == 0)
						{
							onSuccess();
						}
						else
						{
							onError(res);
						}
					});
					return 0;
				}
				else
				{
					//According to LabJackM.h: int Handle, int Address, int Type, double * Value
					errorResult = this.driver.LJM_eWriteAddress(this.handle, address, info.type, value);
				}
			}
			else if((info.directionValid == 1) && (info.type == 98))
			{
				if(useCallBacks)
				{
					errorResult = this.writeS(address, value, onError, onSuccess);
					return 0;
				}
				else
				{
					return this.writeS(address, value);
				}
			}
			else
			{
				if(useCallBacks)
				{
					onError("Invalid Address");
					return driver_const.LJME_INVALID_ADDRESS;
				}
				else
				{
					throw new DriverInterfaceError("Invalid address");
				}
			}
		}
		else
		{
			throw new DriverInterfaceError("Invalid address type.");
		}
		//Check for an error from driver & throw error
		if(errorResult != 0)
		{
			throw new DriverOperationError(errorResult);
		}
		//Return the value written to the labjack device
		return errorResult;
	};
	*/
	/**
	 * Function reads a single string-based modbus address
	 *
	 * @params {number/string} address that you wish to read
	 * @params {string} the string to be written
	 * @return {number} 0 if successful, error message if not
	 * 		NOTE: As long as the error messages are out of range +-10 this is ok.
	 */
	/*
	this.writeS = function(address, strIn)
	{
		this.checkStatus();

		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;
		var strBuffer = new Buffer(50);//max string size
		strBuffer.fill(0);
		strBuffer.write(strIn, 0, strIn.length, 'utf8');
		if((typeof(address))=="string")
		{
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eWriteNameString.async(this.handle, address,strBuffer, function(err, res){
					if (err) throw err;
					if(res == 0)
					{
						//console.log('Length: '+strBuffer.length);
						//console.log('Ans: '+strBuffer.toString());
						//Calculate the size of the string...
						var i = 0;
						while(strBuffer[i] != 0)
						{
							i++;
						}
						//console.log(strBuffer.toString('utf8',0,i).length);
						onSuccess();
					}
					else
					{
						onError(res);
					}
				});
				return 0;
			}
			else
			{
				errorResult = this.driver.LJM_eWriteNameString(this.handle, address, strBuffer);
			}
		}
		else if((typeof(address))=="number")
		{
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eWriteAddressString.async(this.handle, address, strBuffer, function(err, res){
					if (err) throw err;
					if(res == 0)
					{
						//console.log('Length: '+strBuffer.length);
						//console.log('Ans: '+strBuffer.toString());
						//Calculate the size of the string...
						var i = 0;
						while(strBuffer[i] != 0)
						{
							i++;
						}
						//console.log(strBuffer.toString('utf8',0,i).length);
						onSuccess();
					}
					else
					{
						onError(res);
					}
				});
				return 0;
			}
			else
			{
				errorResult = this.driver.LJM_eWriteAddressString(this.handle, address, strBuffer);
			}
		}
		else
		{
			throw new DriverInterfaceError("Invalid address type.");
		}
		//Check for an error from driver & throw error
		if(errorResult != 0)
		{
			throw new DriverOperationError(errorResult);
		}
		var i = 0;
		while(strBuffer[i] != 0)
		{
			i++;
		}
		//return strBuffer.toString('utf8',0,i);
		return 0;
	}
	*/

	/**
	 * Function writes to multiple modbus addresses
	 *
	 * @params {number} address that you wish to read
	 * @params {number} value that you wish to write
	 * @return {number} number that was read or an error message
	 * 		NOTE: As long as the error messages are out of range +-10 this is ok.
	 */
	/*
	this.writeMany = function(addrs, vals)
	{
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];
		var addresses;
		var values;
		if(arguments.length == 5)
		{
			if(arguments[4] == 1)
			{

				//console.log("Len:",vals.length,"FirstTwo",vals[0],vals[1],"StartAddr:",vals[2],vals[vals.length-1])
				if(vals.length < 120)
				{
					var i;
					for(i = 0; i < vals.length; i++)
					{
						//console.log(vals[i].toString(16))
					}
				}
				arguments[3]();
				return 0;
			}
		}
		if(((arguments.length == 1)&&(!useCallBacks)) || ((arguments.length == 3)&&(useCallBacks)))
		{
			try
			{
				var len = arguments[0].length;
				addresses = new Array();
				values = new Array();
				for(var i = 0; i < len; i++)
				{
					addresses.push(arguments[0][i].addr);
					values.push(arguments[0][i].val);	
				}
			}
			catch (e)
			{
				if(useCallBacks)
				{
					onError("Bad input args");
				}
				else
				{
					return -1;
				}
			}
		}
		else
		{
			addresses = addrs;
			values = vals;
		}
		//Get the number of addresses & values and make sure they are equal
		var length = addresses.length;
		if(length != values.length)
		{
			if(useCallBacks)
			{
				onError("length of addresses and values arrays don't match");
				return -1;
			}
			else
			{
				throw new DriverInterfaceError("length of addresses and values arrays don't match");
			}
		}

		this.checkStatus();
		var returnResults = Array();
		var aValues = new Buffer(8*length);
		var errors = new ref.alloc('int',1);
		errors[0]=0;

		var errorResult;

		if((typeof(addresses[0]))=="string")
		{
			var i;
			var offset = 0;
			var aNames = new Buffer(8*length);
			for(i = 0; i < length; i++)
			{
				aValues.writeDoubleLE(values[i],offset);
				var buf = new Buffer(addresses[i].length+1);
				ref.writeCString(buf,0,addresses[i]);
				ref.writePointer(aNames,offset,buf);
				offset+=8;
			}
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eWriteNames.async(this.handle, length, aNames, aValues, errors, function(err, res){
					if(err) throw err;
					if((res == 0))
					{
						onSuccess();
					}
					else
					{
						onError({retError:res, errFrame:errors.deref()});
					}
				});
				return 0;
			}
			else
			{
				//Perform Device I/O function
				errorResult = this.driver.LJM_eWriteNames(this.handle, length, aNames, aValues, errors);
			}
		}
		else if((typeof(addresses[0]))=="number")
		{
			var addrBuff = new Buffer(4*length);
			var addrTypeBuff = new Buffer(4*length);
			var inValidOperation = 0;

			//Integer Returned by .dll function
			var info;
			var offset=0;
			var offsetD = 0;
			i = 0;

			for(i = 0; i < length; i++)
			{
				info = this.constants.getAddressInfo(addresses[i], 'R');
				if(info.directionValid == 1)
				{
					addrTypeBuff.writeInt32LE(info.type,offset);
					addrBuff.writeInt32LE(addresses[i],offset);
					aValues.writeDoubleLE(values[i],offsetD);
					offset += 4;
					offsetD+=8;
				}
				else
				{
					if(useCallBacks)
					{
						onError("Invalid Address: "+addresses[i]+", Index: "+i);
						return driver_const.LJME_INVALID_ADDRESS;
					}
					else
					{
						throw new DriverInterfaceError("Invalid address");
					}
				}
			}
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eWriteAddresses.async(this.handle, length, addrBuff, addrTypeBuff, aValues, errors, function(err, res){
					if(err) throw err;
					if((res == 0))
					{
						onSuccess();
					}
					else
					{
						onError({retError:res, errFrame:errors.deref()});
					}
				});
				return 0;
			}
			else
			{
				//Perform Device I/O function
				errorResult = this.driver.LJM_eWriteAddresses(this.handle, length, addrBuff, addrTypeBuff, aValues, errors);
			}
		}
		else
		{
			if(useCallBacks)
			{
				onError("Invalid address type.");
				return -1;
			}
			else
			{
				throw new DriverInterfaceError("Invalid address type.");
			}
		}
		if(errorResult == 0)
		{
			return 0;
		}
		else
		{
			//return Error
			//throw new DriverOperationError(errorResult);
			return {retError:errorResult, errFrame:errors.deref()}
		}
	};
	*/

	/*
	this.resetConnection = function()
	{
		this.checkStatus();
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;

		if(useCallBacks)
		{
			errorResult = this.driver.LJM_ResetConnection.async(this.handle, function (err, res) {
				if (err) throw err;
				if (res == 0)
				{
					onSuccess();
				}
				else
				{
					onError(res);
				}
			});
			return 0;
		}
		else
		{
			errorResult = this.driver.LJM_ResetConnection(this.handle);
		}
		if(errorResult != 0)
		{
			return errorResult;
		}
		return errorResult;

	}
	*/
	/**
	 * Closes the device if it is currently open using the asynchronous ffi 
	 * method
	 *
	 * @return {number} 
	 */
	this.close = function(onError, onSuccess) {
		//Make sure that a device is open
		if(this.checkStatus(onError)) { return 1;};

		//Call the driver function
		var self = this;
		output = this.ljm.LJM_Close.async(this.handle, function (err, res) {
			if (err) throw err;
			if(res == 0)
			{
				self.handle = null;
				self.deviceType = null;
				self.connectionType = null;
				self.identifier = null;
				onSuccess();
			}
			else
			{
				onError(res);
			}
		});
	}
	/**
	 * Closes the device if it is currently open using the synchronous ffi 
	 * method
	 *
	 * @return {number} 
	 * @throws {DriverInterfaceError} If there has been a closing-error
	 */
	this.closeSync = function() {
		//Make sure that a device is open
		this.checkStatus();

		output = this.ljm.LJM_Close(this.handle);

		if(output == 0) {
			//REPORT NO ERROR HAS OCCURED
			this.handle = null;
			this.deviceType = null;
			this.connectionType = null;
			this.identifier = null;
			return output;
		} else {
			//REPORT CLOSING ERROR HAS OCCURED
			throw new DriverInterfaceError("Closing Device Error", output);
			return output;
		}
	}
	
	// /**
	// returns the index of the firmware constants
	// **/
	// this.getFirmwareVersionInfo = function(deviceType, versionNumber)
	// {
	// 	//Make sure the constants file is loaded
	// 	this.checkFirmwareConstants();

	// 	if((deviceType == 7) || (deviceType == "LJM_dtT7"))
	// 	{
	// 		for(var i = 0; i < this.firmwareVersions.T7.length; i++)
	// 		{
	// 			if(this.firmwareVersions.T7[i].versionNumber == versionNumber)
	// 			{
	// 				return this.firmwareVersions.T7[i];
	// 			}
	// 		}
	// 	}
	// 	else if((deviceType == 200) || (deviceType == "LJM_dtDIGIT"))
	// 	{
	// 		for(var i = 0; i < this.firmwareVersions.Digit.length; i++)
	// 		{
	// 			if(this.firmwareVersions.Digit[i].versionNumber == versionNumber)
	// 			{
	// 				return this.firmwareVersions.Digit[i];
	// 			}
	// 		}
	// 	}
	// 	return null;
	// };
	// /**
	// retuns the file path for the .bin file requested 
	// **/
	// this.getFilePath = function(deviceType, versionNumber)
	// {
	// 	var info = this.getFirmwareVersionInfo(deviceType, versionNumber);
	// 	if(info != null)
	// 	{
	// 		//Build file path
	// 		if((deviceType == 7) || (deviceType == "LJM_dtT7"))
	// 		{
	// 			var filePath = "./downloadedFirmware/T7/";
	// 			filePath += info.fileName;
	// 			return filePath;
	// 		}
	// 		if((deviceType == 200) || (deviceType == "LJM_dtDIGIT"))
	// 		{
	// 			var filePath = "./downloadedFirmware/Digit/";
	// 			filePath += info.fileName;
	// 			return filePath;
	// 		}
	// 	}
	// 	else
	// 	{
	// 		return null;
	// 	}
	// }
	// /**
	// This function loads the firmware versions constants file.  In it exists an array of available
	// firmware versions for download from the labjack website.  It maps the available firmware version
	// to a location where the .bin file can be downloaded.  The variable loaded here can then be used
	// later to download the file/get a file name for a local file.  

	// Function saves the firmware versions file to itself.  Doesn't return it to the caller.

	// Args:
	// (optional): filePath, a string location for the firmwareVersions.json file
	// (optional): callbacks onError & onSuccess, determines functional vs OOP.

	// Functional:
	// Calls onSuccess when file is successfully loaded and parsed.  Doesn't return anything.

	// OOP:
	// returns 0 when successful
	// returns 1 when not successful  
	// **/
	// this.loadFirmwareVersionsFile = function(filePath)
	// {
	// 	var ret = this.checkCallback(arguments);
	// 	var useCallBacks = ret[0];
	// 	var onError = ret[1];
	// 	var onSuccess = ret[2];
	// 	var fp;
	// 	if(useCallBacks)
	// 	{
	// 		if(typeof(filePath)!="string")
	// 		{
	// 			fp = "./firmwareVersions.json";
	// 		}
	// 		else
	// 		{
	// 			fp = filePath;
	// 		}
	// 		var self = this;
	// 		fs.readFile(fp,'utf8',function (err, data){
	// 			if(err)
	// 			{
	// 				onError(err);
	// 			}
	// 			else
	// 			{
	// 				self.firmwareVersions = JSON.parse(data);
	// 				//console.log("num versions available:",self.firmwareVersions.T7.length);
	// 				//console.log("first versionNum:",self.firmwareVersions.T7[0].versionNumber);
	// 				//console.log("first fileName:",self.firmwareVersions.T7[0].fileName);
	// 				//console.log("first location:",self.firmwareVersions.T7[0].location);
	// 				onSuccess();
	// 			}
	// 		});
			
	// 	}
	// 	if(!useCallBacks)
	// 	{
	// 		if(filePath == null)
	// 		{
	// 			fp = "./firmwareVersions.json";
	// 		}
	// 		else
	// 		{
	// 			fp = filePath;
	// 		}
	// 		try
	// 		{
	// 			var firmwareVersionsStr = fs.readFileSync(fp, 'utf8');
	// 			this.firmwareVersions = JSON.parse(firmwareVersionsStr);
	// 		}
	// 		catch (e)
	// 		{
	// 			return 1;
	// 		}
	// 		//console.log("num versions available:",this.firmwareVersions.T7.length);
	// 		//console.log("first versionNum:",this.firmwareVersions.T7[0].versionNumber);
	// 		//console.log("first fileName:",this.firmwareVersions.T7[0].fileName);
	// 		//console.log("first location:",this.firmwareVersions.T7[0].location);
	// 		return 0;
	// 	}
	// };
	// /**
	// This function loads a firmware file located in the proper directory.

	// Functional:
	// onSuccess is called when finished successfully
	// onError is called when failed, returns 1 or 2 based on its status

	// OOP:
	// Returns 0 if the file is successfully loaded
	// Returns 1 if the file is not successfully loaded because it doesn't exist
	// returns 2 if the file is not loaded because the firmwareVersion number isn't found

	// **/
	// this.loadFiwmareFile = function(deviceType, firmwareVersion)
	// {
	// 	//Make sure the constants file is loaded
	// 	this.checkFirmwareConstants();

	// 	//Check for functional vs OOP
	// 	var ret = this.checkCallback(arguments);
	// 	var useCallBacks = ret[0];
	// 	var onError = ret[1];
	// 	var onSuccess = ret[2];

	// 	//Check to see if the requested firmware version is valid
	// 	var filePath = this.getFilePath(deviceType, firmwareVersion);

	// 	//Check for & report errors
	// 	if(filePath == null)
	// 	{
	// 		if(useCallBacks)
	// 		{
	// 			onError(2);
	// 			return 0;
	// 		}
	// 		else
	// 		{
	// 			return 2;
	// 		}
	// 	}

	// 	//Open/Read file into buffer using functional/OOP methods
	// 	if(useCallBacks)
	// 	{
	// 		var self = this;
	// 		fs.readFile(filePath,function(err, data){
	// 			if(err) 
	// 			{
	// 				onError(1);//Error for when file can't be opened because it doesn't exist
	// 			}
	// 			else
	// 			{
	// 				self.firmwareFileBuffer = data;
	// 				onSuccess();
	// 			}
	// 		});
	// 	}
	// 	else
	// 	{
	// 		try
	// 		{
	// 			var ret = fs.readFileSync(filePath);
	// 		}
	// 		catch (e)
	// 		{
	// 			return 1;//Error for when file can't be opened because it doesn't exist
	// 		}
	// 		this.firmwareFileBuffer = ret;
	// 		return 0;
	// 	}
	// };
	// /**
	// This function extracts the loaded firmware file info & stores the data into the fwHeader.
	// **/
	// this.extractLoadedFwHeaderInfo = function()
	// {
	// 	//Make sure there is a pre-buffered firmware file
	// 	this.checkLoadedFirmware();

	// 	//Check for functional vs OOP
	// 	var ret = this.checkCallback(arguments);
	// 	var useCallBacks = ret[0];
	// 	var onError = ret[1];
	// 	var onSuccess = ret[2];

	// 	//console.log(this.fwHeader.headerKey);
	// 	//console.log(this.firmwareFileBuffer.slice(0,128).length);

	// 	var headerBuffer = new Buffer(this.firmwareFileBuffer.slice(0,128));
	// 	//console.log(headerBuffer.length);
	// 	//Check the header key
	// 	if(this.fwHeader.headerKey != headerBuffer.readUInt32BE(driver_const.HEADER_CODE))
	// 	{
	// 		console.log("header key does not match");
	// 		console.log(this.fwHeader.headerKey);
	// 		console.log(headerBuffer.readUInt32BE(0));
	// 		onError("Header Key Does Not Match, HK-read:",headerBuffer.readUInt32BE(driver_const.HEADER_CODE));	
	// 	}
	// 	//Save header info to variables
		
	// 	/*
	// 	this.fwHeader.intendedDevice = headerBuffer.readUInt32BE(driver_const.HEADER_TARGET);
	// 	this.fwHeader.containedVersion = headerBuffer.readFloatBE(driver_const.HEADER_VERSION).toFixed(4);
	// 	this.fwHeader.requiredUpgraderVersion = headerBuffer.readFloatBE(driver_const.HEADER_REQ_LJSU).toFixed(4);
	// 	this.fwHeader.imageNumber = headerBuffer.readUInt16BE(driver_const.HEADER_IMAGE_NUM);
	// 	this.fwHeader.numImgInFile = headerBuffer.readUInt16BE(driver_const.HEADER_NUM_IMAGES);
	// 	this.fwHeader.startNextImg = headerBuffer.readUInt32BE(driver_const.HEADER_NEXT_IMG);
	// 	this.fwHeader.lenOfImg = headerBuffer.readUInt32BE(driver_const.HEADER_IMG_LENG);
	// 	this.fwHeader.imgOffset = headerBuffer.readUInt32BE(driver_const.HEADER_IMG_OFFSET);
	// 	this.fwHeader.numBytesInSHA = headerBuffer.readUInt32BE(driver_const.HEADER_SHA_BYTE_COUNT);
	// 	this.fwHeader.options = headerBuffer.readUInt32BE(72);
	// 	this.fwHeader.encryptedSHA = headerBuffer.readUInt32BE(driver_const.HEADER_ENC_SHA1);
	// 	this.fwHeader.unencryptedSHA = headerBuffer.readUInt32BE(driver_const.HEADER_SHA1);
	// 	this.fwHeader.headerChecksum = headerBuffer.readUInt32BE(driver_const.HEADER_CHECKSUM);
	// 	*/
	// 	this.fwHeader.intendedDevice = headerBuffer.readUInt32BE(driver_const.HEADER_TARGET);
	// 	this.fwHeader.containedVersion = headerBuffer.readFloatBE(driver_const.HEADER_VERSION).toFixed(4);
	// 	this.fwHeader.requiredUpgraderVersion = headerBuffer.readFloatBE(driver_const.HEADER_REQ_LJSU).toFixed(4);
	// 	this.fwHeader.imageNumber = headerBuffer.readUInt16BE(driver_const.HEADER_IMAGE_NUM);
	// 	this.fwHeader.numImgInFile = headerBuffer.readUInt16BE(driver_const.HEADER_NUM_IMAGES);
	// 	this.fwHeader.startNextImg = headerBuffer.readUInt32BE(driver_const.HEADER_NEXT_IMG);
	// 	this.fwHeader.lenOfImg = headerBuffer.readUInt32BE(driver_const.HEADER_IMG_LEN);
	// 	this.fwHeader.imgOffset = headerBuffer.readUInt32BE(driver_const.HEADER_IMG_OFFSET);
	// 	this.fwHeader.numBytesInSHA = headerBuffer.readUInt32BE(driver_const.HEADER_SHA_BYTE_COUNT);
	// 	this.fwHeader.options = headerBuffer.readUInt32BE(72);
	// 	this.fwHeader.encryptedSHA = headerBuffer.readUInt32BE(driver_const.HEADER_ENC_SHA1);
	// 	this.fwHeader.unencryptedSHA = headerBuffer.readUInt32BE(driver_const.HEADER_SHA1);
	// 	this.fwHeader.headerChecksum = headerBuffer.readUInt32BE(driver_const.HEADER_CHECKSUM);
	// 	//console.log(this.fwHeader.intendedDevice);
	// 	//console.log(this.fwHeader.requiredUpgraderVersion);
	// 	//To Support New Device, Add It Here
	// 	if((this.fwHeader.intendedDevice == driver_const.T7_TARGET_OLD)||(this.fwHeader.intendedDevice == driver_const.T7_TARGET))
	// 	{
	// 		this.fwHeader.deviceType = 7;
	// 		this.fwHeader.deviceTypeS = "LJM_dtT7";
	// 	}
	// 	else if(this.fwHeader.intendedDevice == driver_const.DIGIT_TARGET)
	// 	{
	// 		this.fwHeader.deviceType = 200;
	// 		this.fwHeader.deviceTypeS = "LJM_dtDIGIT";
	// 	}
	// 	else
	// 	{
	// 		this.fwHeader.deviceType = -1;
	// 	}

	// 	//console.log(this.fwHeader.lenOfImg/16.0);
	// 	if(useCallBacks)
	// 	{
	// 		onSuccess();
	// 	}
	// 	else
	// 	{
	// 		return 0;
	// 	}
	// };
	// this.getFirmwareVersions = function()
	// {

	// };
	// this.getNewestFirmwareVersion = function()
	// {

	// };
	
	// this.checkFirmwareCompatability = function()
	// {
	// 	//Make sure the constants file is loaded
	// 	this.checkFirmwareConstants();

	// 	//Make sure there is an open device
	// 	this.checkStatus();

	// 	//Make sure the firmware file has been loaded & parsed
	// 	this.checkLoadedFirmware();
	// 	this.checkLoadedFirmwareParsed();

	// 	//Check for functional vs OOP
	// 	var ret = this.checkCallback(arguments);
	// 	var useCallBacks = ret[0];
	// 	var onError = ret[1];
	// 	var onSuccess = ret[2];

	// 	//Initialize firmware update step counter
	// 	this.firmwareUpdateStep = 0;

	// 	//Make sure the loaded firmware device type and currently open device type match
	// 	if((this.deviceType != this.fwHeader.deviceType)&&(this.deviceType != this.fwHeader.deviceTypeS))
	// 	{
	// 		if(useCallBacks)
	// 		{
	// 			console.log(this.deviceType, this.fwHeader.deviceType);
	// 			onError([-1,"Firmware File Does Not Match Opened Device"]);
	// 			return 0;
	// 		}
	// 		else
	// 		{
	// 			return -1;
	// 		}
	// 		this.firmwareUpdateStep = -1;
	// 	}

	// 	//Update Step Counter to indicate loaded firmware & currently open device match
	// 	this.firmwareUpdateStep = 1;

	// 	if(useCallBacks)
	// 	{
	// 		onSuccess();
	// 		return 0;
	// 	}
	// 	else
	// 	{
	// 		return 0;
	// 	}
	// };
	// this.readFirstImagePage = function()
	// {

	// };
	// this.readFlash = function(key, address)
	// {

	// };
	// this.eraseFlash = function(step)
	// {
	// 	//Make sure the constants file is loaded
	// 	this.checkFirmwareConstants();

	// 	//Make sure there is an open device
	// 	this.checkStatus();

	// 	//Make sure the firmware file has been loaded & parsed
	// 	this.checkLoadedFirmware();
	// 	this.checkLoadedFirmwareParsed();

	// 	//Check for functional vs OOP
	// 	var ret = this.checkCallback(arguments);
	// 	var useCallBacks = ret[0];
	// 	var onError = ret[1];
	// 	var onSuccess = ret[2];
		
	// 	if(this.firmwareUpdateStep!=step)
	// 	{
	// 		if(useCallBacks)
	// 		{
	// 			onError("Skipped a Upgrade Step, err-eraseFlash");
	// 			return -1;
	// 		}
	// 		else
	// 		{
	// 			return -1;
	// 		}
	// 	}
	// 	if(useCallBacks)
	// 	{
	// 		if(this.fwHeader.deviceType == 7)
	// 		{
	// 			//Clear Stuff for T7
	// 			/*
	// 			Erase 120 pages of flash (a page is 4096 bytes). 
	// 			Starting from the External Firmware Image Origin. 
	// 			(Found in the Flash Addresses document)
	// 			*/
	// 			/*
	// 			First attempt: following directly what kippling is doing....
	// 			*/
	// 			//1. Erase one page of flash
	// 			var self = this;
	// 			this.bulkEraseFlash(
	// 				driver_const.T7_EFkey_ExtFirmwareImgInfo, 
	// 				driver_const.T7_EFAdd_ExtFirmwareImgInfo, 
	// 				driver_const.T7_HDR_FLASH_PAGE_ERASE, 
	// 				function(err) //onError
	// 				{
	// 					//onError
	// 					console.log(err);
	// 					onError("failed-erase1");
	// 				},
	// 				function(res) //onSuccess
	// 				{
	// 					//on successful first erase, erase 120 pages.
	// 					self.bulkEraseFlash(
	// 						driver_const.T7_EFkey_ExtFirmwareImage, 
	// 						driver_const.T7_EFAdd_ExtFirmwareImage, 
	// 						driver_const.T7_IMG_FLASH_PAGE_ERASE, 
	// 						function(err) //onError
	// 						{
	// 							//onError
	// 							onError("failed-erase2");
	// 						},
	// 						function(res) //onSuccess
	// 						{
	// 							//onSuccess
	// 							self.firmwareUpdateStep++;
	// 							onSuccess();
	// 						});
	// 				});
	// 		}
	// 		else if(this.fwHeader.deviceType == 200)
	// 		{
	// 			//Clear Stuff for Digit
	// 		}
	// 	}
	// };
	// this.bulkEraseFlash = function(key, address, noPages)
	// {
	// 	//Make sure there is an open device
	// 	this.checkStatus();

	// 	//Check for functional vs OOP
	// 	var ret = this.checkCallback(arguments);
	// 	var useCallBacks = ret[0];
	// 	this.onError = ret[1];
	// 	this.onSuccess = ret[2];
	// 	this.numCalls = 0;
	// 	var totalRequests = noPages;
	// 	this.numErrs=0;
	// 	var self = this;
	// 	//var info = this.constants.getAddressInfo(driver_const.T7_MA_EXF_KEY, 'W');
	// 	//console.log(info);
	// 	//info = this.constants.getAddressInfo(driver_const.T7_MA_EXF_ERASE, 'W');
	// 	//console.log(info);
	// 	var i;
	// 	console.log(key,address,noPages);
	// 	for(i = 0; i < noPages; i++)
	// 	{
	// 		console.log()
	// 		this.writeMany(
	// 			[driver_const.T7_MA_EXF_KEY,driver_const.T7_MA_EXF_ERASE],
	// 			[key,address + i * driver_const.T7_FLASH_PAGE_SIZE],
	// 			function(err){//onError
	// 				self.numCalls++;
	// 				self.numErrs++;
	// 				if(self.numCalls == totalRequests)
	// 				{
	// 					self.onError(err);
	// 				}
	// 			},
	// 			function(res){//onSuccess
	// 				self.numCalls++;
	// 				if(self.numCalls == totalRequests)
	// 				{
	// 					if(self.numErrs != 0)
	// 					{
	// 						self.onError();
	// 					}
	// 					else
	// 					{
	// 						self.onSuccess();
	// 					}
	// 				}
	// 			});
	// 	}
	// 	//console.log('1');
	// 	//onSuccess();
	// };
	// this.writeBinary = function()
	// {
	// 	//Make sure the constants file is loaded
	// 	this.checkFirmwareConstants();

	// 	//Make sure there is an open device
	// 	this.checkStatus();

	// 	//Make sure the firmware file has been loaded & parsed
	// 	this.checkLoadedFirmware();
	// 	this.checkLoadedFirmwareParsed();

	// 	//Check for functional vs OOP
	// 	var ret = this.checkCallback(arguments);
	// 	var useCallBacks = ret[0];
	// 	var onError = ret[1];
	// 	var onSuccess = ret[2];
		
	// 	if(this.firmwareUpdateStep!=2)
	// 	{
	// 		if(useCallBacks)
	// 		{
	// 			onError("Skipped a Upgrade Step, err-writeFlash");
	// 			return -1;
	// 		}
	// 		else
	// 		{
	// 			return -1;
	// 		}
	// 	}
	// 	if(useCallBacks)
	// 	{
	// 		if(this.fwHeader.deviceType == 7)
	// 		{
	// 			//Clear Stuff for T7
	// 			//1. Write Flash
	// 			//(Transfer FW image to External Flash)
	// 			var self = this;
	// 			this.writeFlash(
	// 				driver_const.T7_EFkey_ExtFirmwareImage,
	// 				driver_const.T7_EFAdd_ExtFirmwareImage,
	// 				driver_const.T7_IMG_HEADER_LENGTH,
	// 				(this.firmwareFileBuffer.length-driver_const.T7_IMG_HEADER_LENGTH),//ImageLength - header_length
	// 				driver_const.T7_IMG_HEADER_LENGTH,
	// 				function(err){
	// 					onError("FirstWriteError");
	// 				},
	// 				function(res){
	// 					//onSuccess();
	// 					self.writeFlash(
	// 						driver_const.T7_EFkey_ExtFirmwareImgInfo	,
	// 						driver_const.T7_EFAdd_ExtFirmwareImgInfo	,
	// 						0,
	// 						driver_const.T7_IMG_HEADER_LENGTH,
	// 						0,
	// 						function(err){
	// 							onError("SecondWriteError");
	// 						},
	// 						function(res){
	// 							self.firmwareUpdateStep++;
	// 							onSuccess();
	// 						});
	// 				});
	// 		}
	// 		else if(this.fwHeader.deviceType == 200)
	// 		{
	// 			//Clear Stuff for Digit
	// 		}
	// 	}
	// };
	// this.writeFlash = function(flashKey, flashAdd, offset, length, startOffset)
	// {
	// 	//console.log("beforeError");
	// 	//Make sure firmware stuff is all loaded
	// 	this.checkFirmwareConstants();
	// 	this.checkLoadedFirmware();
	// 	this.checkLoadedFirmwareParsed();

	// 	//Make sure there is an open device
	// 	this.checkStatus();


	// 	//get firmware file
	// 	var fileBuf = new Buffer(this.firmwareFileBuffer);
	// 	//Check for functional vs OOP
	// 	var ret = this.checkCallback(arguments);
	// 	var useCallBacks = ret[0];
	// 	var onError = ret[1];
	// 	var onSuccess = ret[2];
		
	// 	//console.log(flashKey, flashAdd, offset, length);

	// 	//Variable used for retrieving data from firmware file
	// 	var startByte = offset;

	// 	//Preliminary Calcs
	// 	//Determine total number of pages, and any partial pages
	// 	var NumPages = length / driver_const.T7_FLASH_PAGE_SIZE;
	// 	var PartPageBytes = length % driver_const.T7_FLASH_PAGE_SIZE;

	// 	//Update parameter arrays and NumFrames variable?
	// 	var NumFrames = 2;
		
	// 	//Write Data to FLASH
	// 	//Note: We write data to flash in 32-register blocks, consisting ??. 
	// 	//		32-bytes is arbetrary and may be changed to increase efficiency if needed
	// 	// 		This can be done by changing the T7_FLASH_BLOCK_WRITE constant

	// 	var i,j,k;
	// 	var numComplete = 0;
	// 	//var addresses = ["T7_MA_EXF_KEY", "T7_MA_EXF_WRITE"];
	// 	//var values = [flashKey, (Address + (j * driver_const.T7_FLASH_BLOCK_WRITE_SIZE * 4))];
	// 	/*
	// 	for(i = 0; i < NumPages; i++)
	// 	{
	// 		//Calculate start address of current FLASH page
	// 		var Address = flashAdd + (i * driver_const.T7_FLASH_PAGE_SIZE);

	// 		//Number of blocks to write - full and partial pages
	// 		if((PartPageBytes > 0) && (i == NumPages - 1))
	// 		{
	// 			NumWrites = PartPageBytes / 4 / driver_const.T7_FLASH_BLOCK_WRITE_SIZE;
	// 		}
	// 		else
	// 		{
	// 			NumWrites = driver_const.T7_FLASH_PAGE_SIZE / 4 / driver_const.T7_FLASH_BLOCK_WRITE_SIZE;
	// 		}

	// 		//Build block and write to flash
	// 		for(j = 0; j < NumWrites; j++)
	// 		{
	// 			//console.log(i,j,startByte, this.firmwareFileBuffer.length);
	// 			for(k = 0; k < driver_const.T7_FLASH_BLOCK_WRITE_SIZE; k++)
	// 			{
	// 				addresses.push("T7_MA_EXF_WRITE");
	// 				values.push(fileBuf.readUInt32BE(startByte));
	// 				startByte += 4;//Increment by 4 bytes, size of int.
	// 			}
	// 			numComplete++;
	// 		}
	// 	}
	// 	*/
	// 	//console.log(addresses.length, values.length, (NumPages * NumWrites), numComplete);
	// 	//this.writeMany(addresses, values, onError, onSuccess);


	// 	var curPage = 0;
	// 	var curWrite = 0;
	// 	//Configure array's for initial device-write
	// 	//Calculate start address of current FLASH page

	// 	var addresses = [driver_const.T7_MA_EXF_KEY,driver_const.T7_MA_EXF_pWRITE];

	// 	var values = [flashKey, flashAdd];
	// 	var NumWrites = 0;

	// 	//Number of blocks to write - full and partial pages
	// 	if((PartPageBytes > 0) && (i == NumPages - 1))
	// 	{
	// 		NumWrites = PartPageBytes / 4 / driver_const.T7_FLASH_BLOCK_WRITE_SIZE;
	// 	}
	// 	else
	// 	{
	// 		NumWrites = driver_const.T7_FLASH_PAGE_SIZE / 4 / driver_const.T7_FLASH_BLOCK_WRITE_SIZE;
	// 	}
	// 	//console.log("write");
		
	// 	var self = this;

	// 	var k;
	// 	var numLoad = 0;
	// 	var numLoop = 0;

	// 	//Make sure that there is enough room in the firmware file
	// 	//if the difference between the length of the file and the current offset is greater than 
	// 	//the standard block-write size then write the largest-blocks
	// 	//if((self.firmwareFileBuffer.length - offset) >= (driver_const.T7_FLASH_BLOCK_WRITE_SIZE*4))
	// 	if((length - (offset-startOffset+numLoad)) > (driver_const.T7_FLASH_BLOCK_WRITE_SIZE*4))
	// 	{
	// 		//console.log("loadMax");
	// 		numLoad = driver_const.T7_FLASH_BLOCK_WRITE_SIZE*4;
	// 		numLoop = driver_const.T7_FLASH_BLOCK_WRITE_SIZE;
	// 	}
	// 	//otherwise, create a custom number of writes, this controls specificaly end-of file issues.
	// 	else
	// 	{
	// 		numLoad = length - (offset-startOffset);
	// 		numLoop = numLoad/4;
	// 		console.log("LoadCustom",numLoad, numLoop);			
	// 	}
	// 	//if the current number of bytes being loaded is more than the length subtracted by the shifted offset then
	// 	//re-set the numLoad & numLoop variables to be proper values
	// 	if(numLoad > (length - (offset-startOffset)))
	// 	{
	// 		numLoad = length - (offset-startOffset);
	// 		numLoop = numLoad/4;
	// 		console.log("Load&Loop Fixed",numLoad, numLoop);
	// 	}
		

	// 	//Create a buffer of the relevant data, this compresses the data into UInt's to be written to the device
	// 	//Maybe not BE?????????!?!?!?!
	// 	var fileBuf = new Buffer(self.firmwareFileBuffer.slice(offset,(numLoad)+offset));
	// 	for(k = 0; k < numLoop; k++)
	// 	{
	// 		addresses.push(driver_const.T7_MA_EXF_WRITE+k*2);
	// 		values.push(fileBuf.readUInt32BE((k * 4)));
	// 	}
	// 	console.log(
	// 		"%Complete",((offset-startOffset)/length*100).toFixed(3), 
	// 		"\tCurOffset:",offset, 
	// 		"\tAddress:",flashAdd.toString(16),
	// 		"\tFileLen:",self.firmwareFileBuffer.length,
	// 		"inputLen",length, 
	// 		"BytesWritten",numLoad, 
	// 		"IntsWritten",numLoop, 
	// 		"Len",values.length,
	// 		"Line:",(offset-startOffset)*8/128+9,
	// 		"First:",values[2].toString(16));
	// 	//console.log("before-call", addresses, values);
	// 	if(numLoad > 0)
	// 	{
	// 		var retVar = self.writeMany(
	// 			addresses, 
	// 			values, 
	// 			function(res){
	// 				//Error Function
	// 				console.log("ERROR-Case", res,typeof(onError), typeof(onSuccess));
	// 				console.log("blah");
	// 				onError(res);

	// 			},
	// 			function(res){
	// 				//Success Function
	// 				//console.log("oldVars", flashAdd, offset, length);
	// 				//if there is atleast one normal block that can be written, increment by full amount
	// 				if((length - (offset-startOffset+numLoad)) > (driver_const.T7_FLASH_BLOCK_WRITE_SIZE*4))
	// 				{
	// 					//console.log("WriteIncNormal");
	// 					//Leave flash key un-touched, increment flashAdd by the amount written, increment the offset, & dont change the rest
	// 					//flashAddress & offset should be incremented byte-wise (as the unit)
	// 					self.writeFlash(flashKey, flashAdd + numLoad, (offset + numLoad), length, startOffset, onError, onSuccess)
	// 				}
	// 				else if ((offset-startOffset+numLoad) < length)
	// 				{
	// 					console.log("WriteIncMini");
	// 					console.log('diff:',offset+numLoad);
	// 					//Leave flash key un-touched, increment flashAdd by the amount written, increment the offset, & dont change the rest
	// 					//flashAddress & offset should be incremented byte-wise (as the unit)
	// 					self.writeFlash(flashKey, flashAdd + numLoad, (offset + numLoad), length, startOffset, onError, onSuccess)
	// 				}
	// 				else
	// 				{
	// 					console.log("Write-End");
	// 					onSuccess();
	// 				}
	// 				//console.log('yay, success function');
	// 			});
	// 	}
	// 	else
	// 	{
	// 		console.log("Write-End, No bytes to be written");
	// 		onSuccess();
	// 	}
	// 	//console.log("Return Var",retVar);
		
		
	// 	//onSuccess();

	// }
	// this.reInitializeDevice = function()
	// {
	// 	//Make sure the constants file is loaded
	// 	this.checkFirmwareConstants();

	// 	//Make sure there is an open device
	// 	this.checkStatus();

	// 	//Make sure the firmware file has been loaded & parsed
	// 	this.checkLoadedFirmware();
	// 	this.checkLoadedFirmwareParsed();

	// 	//Check for functional vs OOP
	// 	var ret = this.checkCallback(arguments);
	// 	var useCallBacks = ret[0];
	// 	var onError = ret[1];
	// 	var onSuccess = ret[2];
	// 	console.log(this.firmwareUpdateStep);
	// 	if(this.firmwareUpdateStep!=3)
	// 	{
	// 		if(useCallBacks)
	// 		{
	// 			onError("Skipped a Upgrade Step, err-writeFlash");
	// 			return -1;
	// 		}
	// 		else
	// 		{
	// 			return -1;
	// 		}
	// 	}

	// 	this.write(driver_const.T7_MA_REQ_FWUPG,driver_const.T7_REQUEST_FW_UPGRADE, onError, onSuccess);
	// }
	// this.updateFirmware = function(versionNumber)
	// {
	// 	//Make sure the constants file is loaded
	// 	this.checkFirmwareConstants();

	// 	//Make sure there is an open device
	// 	this.checkStatus();

	// 	//Check for functional vs OOP
	// 	var ret = this.checkCallback(arguments);
	// 	var useCallBacks = ret[0];
	// 	var onError = ret[1];
	// 	var onSuccess = ret[2];

	// 	if(useCallBacks)
	// 	{
	// 		onSuccess();
	// 	}
	// 	else
	// 	{
	// 		//this.loadFiwmareFile
	// 	}

		
	// };
	this.checkStatus = function(onError)
	{
		if((this.handle == null) && (this.deviceType == null))
		{
			if(onError === null)
			{
				throw new DriverInterfaceError("Device Never Opened");
			}
			else
			{
				onError("Device Never Opened");
				return 1;
			}
		}
	};
	this.checkFirmwareConstants = function()
	{
		if(this.firmwareVersions == null)
		{
			throw new DriverInterfaceError("Firmware Versions File Not Loaded");
		}
	};
	this.checkLoadedFirmware = function()
	{
		if(this.firmwareFileBuffer == null)
		{
			throw new DriverInterfaceError("Firmware .bin File Not Loaded");
		}
	}
	this.checkLoadedFirmwareParsed = function()
	{
		if(this.fwHeader == null)
		{
			throw new DriverInterfaceError("Firmware .bin File Not Parsed");
		}
	}

	//********************* EXTRA ACCESSORY FUNCTIONS ********************


};