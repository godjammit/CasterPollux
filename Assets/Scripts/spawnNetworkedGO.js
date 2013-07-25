#pragma strict

var go : GameObject;

function Start () {
	if (Network.isServer)
		Network.Instantiate(go, transform.position, transform.rotation, 0); 
}