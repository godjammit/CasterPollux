#pragma strict

var target : GameObject;

var xmod : int;
var ymod : int;
var zmod : int;

function Start () {

}

function Update () {
	transform.position.x = target.transform.position.x + xmod;
	transform.position.y = target.transform.position.y + ymod;
	transform.position.z = target.transform.position.z + zmod;
}