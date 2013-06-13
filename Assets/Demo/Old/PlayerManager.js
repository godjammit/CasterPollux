#pragma strict


var player : GameObject;
var start : Transform;
var prefab : GameObject;

var controlledplayer : GameObject;

public var controlled = [];

function Start () 
{
	
}
function Update () 
{
	
}
function OnGUI () 
{
	if (Network.isServer == true)
	{
		if (GUI.Button(new Rect(100,500,100,25), "Create Player"))
		{
			controlledplayer = Network.Instantiate(prefab, Vector3(start.position.x, start.position.y, start.position.z), Quaternion.identity, 0);
					
			GameObject.FindGameObjectWithTag("MainCamera").GetComponent(Follow).target = controlledplayer;
		}
	}
}