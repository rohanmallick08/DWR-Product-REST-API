/**
* Description of the Controller and the logic it provides
*
* @module  controllers/ProductService
*/

'use strict';

//API Include

var object = require('dw/object');
var catalog = require('dw/catalog');
var Transaction = require('dw/system/Transaction');
var util = require('dw/util');
var customer = require('dw/customer');


exports.Service = function() {
	var req = request;
	response.setContentType('application/json');
	//Check if Request is POST
	if(request.httpMethod != 'POST') {
		return;
	}
	if(!request.isHttpSecure() && request.httpMethod !== 'GET') {
		return response.writer.print(JSON.stringify({'fault' : 'FORBIDDEN', 'status' : '403'}));
	}
	
	var authStatus = performBasicAuth();
	
	if(!authStatus.status && authStatus.message == 'INVALID_CRED') {
		return response.writer.print(JSON.stringify({'fault' : 'INVALID CREDENTIAL'}));
		
	} else if(!authStatus.status && authStatus.message == 'MISSING') {
		return response.writer.print(JSON.stringify({'fault' : 'USER NAME OR PASSWORD MISSING'}));
		
	} else if(!authStatus.status && authStatus.message == 'BAD_REQ') {
		return response.writer.print(JSON.stringify({'fault' : 'BAD REQUEST'}));
	}
	
	try {
		//Get the Body from request
		var bodyObj = JSON.parse(request.httpParameterMap.getRequestBodyAsString());
		var describeProductObject = object.SystemObjectMgr.describe('Product');
		
		//Get the Method from Body
		if(!empty(bodyObj.method)) {
			switch(bodyObj.method) {
			case 'describe':
				//return all Product object System attribute and custom attribute
				
				
				var attributeJSON = {};
				var attrArray = [];
				for(let i=0; i<describeProductObject.attributeDefinitions.length; i++) {
					var subObj = {
							'ID' : describeProductObject.attributeDefinitions[i].ID,
							'type' : describeProductObject.attributeDefinitions[i].system ? 'System' : 'Custom'
					}
					attrArray.push(subObj);
				}
				attributeJSON = JSON.stringify(attrArray);
				return response.writer.print(attributeJSON);
				break;
			case 'get' :
				/* 
				 * Mandatory Parameter
				 * “productId” and “attribute”
				 * @return value of “attribute” 
				 */
				if(!empty(bodyObj.productId) && !empty(bodyObj.attribute)) {
					//Get the Product
					var product = catalog.ProductMgr.getProduct(bodyObj.productId);
					var value;
					
					for(let i=0; i<describeProductObject.attributeDefinitions.length; i++) {
						if(describeProductObject.attributeDefinitions[i].ID == bodyObj.attribute) {
							if(describeProductObject.attributeDefinitions[i].system) {
								value = product[bodyObj.attribute];
							} else {
								value = product.custom[bodyObj.attribute];
							}
						}
					}
					//If no value return 
					if(empty(value)) {
						return response.writer.print(JSON.stringify({"fault" : 'Could not find any detail'}));
					} else {
						var resObj =  {}
						resObj[bodyObj.attribute] = value
						return response.writer.print(JSON.stringify(resObj));
					}
					
				} else {
					return response.writer.print(JSON.stringify({"fault" : 'Either Product ID or attribute is missing'}));
				}
				break;
			case 'set':
				/* 
				 * Mandatory Parameter
				 * “productId” and “attribute” and "Value"
				 * @return value of Success message 
				 */
				if(!empty(bodyObj.productId) && !empty(bodyObj.attribute) && !empty(bodyObj.value)) {
					//Get the Product
					var product = catalog.ProductMgr.getProduct(bodyObj.productId);
					var didWeSet = false;
					for(let i=0; i<describeProductObject.attributeDefinitions.length; i++) {
						if(describeProductObject.attributeDefinitions[i].ID == bodyObj.attribute) {
							Transaction.wrap(function() {
								if(describeProductObject.attributeDefinitions[i].system) {
									product[bodyObj.attribute] = bodyObj.value;
									didWeSet = true;
								} else {
									product.custom[bodyObj.attribute] = bodyObj.value;
									didWeSet = true;
								}
							});
						}
					}
					//If no value return 
					if(didWeSet) {
						return response.writer.print(JSON.stringify({'Success' : 'Successfully modified'}));
					} else {
						return response.writer.print(JSON.stringify({"fault" : 'could not set value'}));
					}
					
				} else {
					return response.writer.print(JSON.stringify({"fault" : 'Either Product ID or attribute is missing'}));
				}
				
				/*
				 * Exception occurred during request processing: QuotaObjectReadOnlyException Quota 'object.ProductPO.readonly' does not permit write access in 'Storefront'.
				 */
				break;
			default:
				return response.writer.print(JSON.stringify({"fault" : 'Could not process you request'}));
			
			}
		}
	} catch(e) {
		return response.writer.print(JSON.stringify({"fault" : 'Could not process you request'}));
	}
}

/* Basic Auth*/

function performBasicAuth() {
	
	try {
		var basicAuth = request.httpHeaders.get('x-is-authorization');
		if(!empty(basicAuth)) {
			var encodedValue = util.StringUtils.decodeBase64(util.StringUtils.trim(basicAuth.replace('Basic', ''))).split(':');
			if(!empty(encodedValue[0]) && !empty(encodedValue[1])) {
				var cust;
				Transaction.wrap(function() {
					cust = customer.CustomerMgr.loginCustomer(encodedValue[0], encodedValue[1], false);
				});
				if(!empty(cust) && cust.authenticated) {
					return {'status' : true};
				} else {
					return {'status' : false, 'message' : 'INVALID_CRED'}
				}
				
			} else {
				return {'status' : false, 'message' : 'MISSING'}
			}
		} else {
			return {'status' : false, 'message' : 'BAD_REQ'}
		}
	} catch(e) {
		
		return {'status' : false, 'message' : 'BAD_REQ'}
	}
}

exports.Service.public = true;

