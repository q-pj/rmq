import 'package:flutter/cupertino.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:rmq/shared/constants.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

class EditProductForm extends StatefulWidget {
	@override
	_EditProductFormState createState() => _EditProductFormState();
}

class _EditProductFormState extends State<EditProductForm> {

	// @override
	// void initState(){
	// 	final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
	// 	super.initState();
	// }

	final _formKey = GlobalKey<FormState>();
	//static final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
	final databaseReference = FirebaseFirestore.instance;
	
	bool isLoading = false;
	String error = '';
	String _itemcode = '';
	String _productName = '';
	String _retailPrice = '';
	String _wholesalePrice = '';
	String _category = '';
	String _imageURL = '';

	void addProduct(String name, String itemcode, String category, String wholesale, String retail) async {
		try{
			await databaseReference
				.collection("PriceList")
				.doc(name)
				.update({
					'retail': retail,
					'wholesale': wholesale,
					'name': name,
					'category': category,
					'itemcode': itemcode,
					//'imageURL': imageURL,
				})
				.then((value) => print("Updated"))
				.catchError((error) => print("Failed to update user: $error"));
		} catch (e) {
			print(e.toString());
		}
	}

	@override
	Widget build(BuildContext context) {
		QueryDocumentSnapshot _passedVar = ModalRoute.of(context).settings.arguments;
		//String _passedVar = ModalRoute.of(context).settings.arguments;
		//final Map<String, dynamic> _passedVar = ModalRoute.of(context).settings.arguments;
		//Stream<DocumentSnapshot> docStream = databaseReference.collection("PriceList").doc(_passedVar['name']).snapshots();

		//_itemcode = _passedVar['itemcode'].toString();
		// _itemcode = 'SOMETHING';
		// _productName = _passedVar['name'].toString();
		// _retailPrice = _passedVar['retail'].toString();
		// _wholesalePrice	= _passedVar['wholesale'].toString();
		// _category	= _passedVar['category'].toString();
		// _imageURL = _passedVar['imageURL'].toString();
		print(_itemcode);
		
		return StreamBuilder(
			stream: databaseReference.collection("PriceList").doc(_passedVar['name']).snapshots(),
			builder: (BuildContext context, AsyncSnapshot<DocumentSnapshot> snapshot) {
				// if(snapshot.connectionState != ConnectionState.active){
				// 	return CircularProgressIndicator();
				// } else {
				return Scaffold(
					backgroundColor: Colors.grey[200],
					body: Padding(
						padding: EdgeInsets.only(right: 30.0, left: 30.0, top: 10.0),
						child: Form(
							key: _formKey,
							child: Column(
								children: <Widget>[
									SizedBox(height: 20.0),
									TextFormField(
										decoration:
											textInputDecoration.copyWith(hintText: 'Product Name', labelText: 'Product Name',),
										validator: (val) =>
											val.isEmpty ? 'Please enter product name' : null,
										onChanged: (val) => setState(() => _productName = val),
										//onChanged: (val) => setState((){ _productName = val; }),
										initialValue: _passedVar['name'],
										onSaved: (String value) { _productName = value;},
									),
									SizedBox(height: 15.0),
									TextFormField(
										decoration:
											textInputDecoration.copyWith(hintText: 'Item Code', labelText: 'Item Code'),
										validator: (val) =>
											val.isEmpty ? 'Please enter Item code' : null,
										//onChanged: (val) => setState(() => _itemcode = val),
										initialValue: _passedVar['itemcode'],
										onSaved: (String value) { _itemcode = value;},
									),
									SizedBox(height: 15.0),
									TextFormField(
										decoration:
											textInputDecoration.copyWith(hintText: 'Wholesale Price', labelText: 'Wholesale Price'),
										inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),],
										keyboardType: TextInputType.numberWithOptions(decimal: true),
										validator: (val) =>
											val.isEmpty ? 'Please enter wholesale price' : null,
										onChanged: (val) => setState(() => _wholesalePrice = val),
										initialValue: _passedVar['wholesale'],
										onSaved: (String value) { _wholesalePrice = value;},
									),
									SizedBox(height: 15.0),
									TextFormField(
										inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),],
										keyboardType: TextInputType.numberWithOptions(decimal: true),
										decoration:
											textInputDecoration.copyWith(hintText: 'Retail Price', labelText: 'Retail Price'),
										validator: (val) =>
											val.isEmpty ? 'Please enter retail price' : null,
										onChanged: (val) => setState(() => _retailPrice = val),
										initialValue: _passedVar['retail'],
										onSaved: (String value) { _retailPrice = value;},
									),
									SizedBox(height: 15.0),
									TextFormField(
										decoration:
											textInputDecoration.copyWith(hintText: 'Category', labelText: 'Category'),
										validator: (val) =>
											val.isEmpty ? 'Please enter product\'s category' : null,
										onChanged: (val) => setState(() => _category = val),
										initialValue: _passedVar['category'],
										onSaved: (String value) { _category = value;},
									),
									SizedBox(height: 20.0),
									RaisedButton(
										color: rmqPrimaryColor,
										padding:
											EdgeInsets.symmetric(vertical: 25.0, horizontal: 130.0),
										child: Text(
										'Done',
										style: TextStyle(color: Colors.white, fontSize: 15.0),
										),
										onPressed: () async {
											try {
												//print(_productName + ' click ' + _itemcode);
												print(_productName);
												print(_retailPrice);
												print(_wholesalePrice);
												print(_itemcode);
												print(_category);
												print(_imageURL);
												if (_formKey.currentState.validate()) {
													_formKey.currentState.save();
													//print(snapshot.data['name'] + ' click ' + _productName);
													addProduct(_productName, _itemcode, _category, _wholesalePrice, _retailPrice);
													Navigator.pop(context);
												}
											} catch (e) {
												setState(() {
													error = e.toString();
												});
											}
										},
									),
									Text(
										error,
										style: TextStyle(color: rmqPrimaryColor, fontSize: 14.0),
									),
								],
							),
						),
					),
				);
			}
		);
			
	}
}