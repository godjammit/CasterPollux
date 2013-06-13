#pragma strict

var Caster : GameObject;
var Pollux : GameObject;

function Start () {

}

function Update () {
	if (Network.isClient)
		this.GetComponent(Follow).target = Pollux;
	
	this.GetComponent(Follow).target = Caster;
}