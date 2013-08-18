var spring = 50.0;
var damper = 5.0;
var drag = 10.0;
var angularDrag = 5.0;
var distance = 0.2;
var attachToCenterOfMass = false;

public static var isPK : boolean = false;

private var mobile : boolean = false;

private var springJoint : SpringJoint;

function Start () {
	if (Application.platform == RuntimePlatform.Android || Application.platform == RuntimePlatform.IPhonePlayer) 
		mobile = true;
}


function Update ()
{
	isPK = false;
	
	// Make sure the user pressed the mouse down
	if (!Input.GetMouseButtonDown (0) || Input.touchCount < 0)
		return;

	var mainCamera = FindCamera();
		
	// We need to actually hit an object
	var hit : RaycastHit;
	
	if (mobile) 
	{
		if (!Physics.Raycast(mainCamera.ScreenPointToRay(Input.GetTouch(0).position),  hit, 100))
			return;
	}
	else {
		if (!Physics.Raycast(mainCamera.ScreenPointToRay(Input.mousePosition),  hit, 100))
			return;
	}
	
	//teleport if you're supposed to
	if (hit.transform.gameObject.tag.Equals("Tele") || hit.transform.Equals(this.transform)) {
		SmoothFollow2D.target = hit.transform;
	}

		
	// We need to hit a rigidbody that is not kinematic
	if (!hit.rigidbody || hit.rigidbody.isKinematic)
		return;
	
	if (!springJoint)
	{
		var go = new GameObject("Rigidbody dragger");
		var body : Rigidbody = go.AddComponent ("Rigidbody") as Rigidbody;
		springJoint = go.AddComponent ("SpringJoint");
		body.isKinematic = true;
	}
	
	springJoint.transform.position = hit.point;
	if (attachToCenterOfMass)
	{
		var anchor = transform.TransformDirection(hit.rigidbody.centerOfMass) + hit.rigidbody.transform.position;
		anchor = springJoint.transform.InverseTransformPoint(anchor);
		springJoint.anchor = anchor;
	}
	else
	{
		springJoint.anchor = Vector3.zero;
	}
	
	springJoint.spring = spring;
	springJoint.damper = damper;
	springJoint.maxDistance = distance;
	springJoint.connectedBody = hit.rigidbody;
	
	hit.transform.gameObject.networkView.RPC("changeOwner", RPCMode.AllBuffered, Network.AllocateViewID());
	
	StartCoroutine ("DragObject", hit.distance);
}

function DragObject (distance : float)
{
	isPK = true;
	var oldDrag = springJoint.connectedBody.drag;
	var oldAngularDrag = springJoint.connectedBody.angularDrag;
	springJoint.connectedBody.drag = drag;
	springJoint.connectedBody.angularDrag = angularDrag;
	var mainCamera = FindCamera();
	while (Input.GetMouseButton (0) || Input.touchCount > 0)
	{
		var ray = mainCamera.ScreenPointToRay (Input.mousePosition);
		if (mobile)
			ray = mainCamera.ScreenPointToRay (Input.GetTouch(0).position);
		springJoint.transform.position = ray.GetPoint(distance);
		yield;
	}
	if (springJoint.connectedBody)
	{
		springJoint.connectedBody.drag = oldDrag;
		springJoint.connectedBody.angularDrag = oldAngularDrag;
		springJoint.connectedBody = null;
	}
}

function FindCamera ()
{
	if (camera)
		return camera;
	else
		return Camera.main;
}