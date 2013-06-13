#pragma strict

function Start () {

}

function Update () {
}

function OnSerializeNetworkView(stream : BitStream, info : NetworkMessageInfo) {
    var position : Vector3;
    var rotation : Quaternion;
    var velocity : Vector3;
    var angularVelocity : Vector3;

    if (stream.isWriting)
    {
        position = rigidbody.position;
        rotation = rigidbody.rotation;
        velocity = rigidbody.velocity;
        angularVelocity = rigidbody.angularVelocity;
        stream.Serialize (position);
        stream.Serialize (rotation);
        stream.Serialize (velocity);
        stream.Serialize (angularVelocity);
    }

    else

    {
        stream.Serialize (position);
        stream.Serialize (rotation);
        stream.Serialize (velocity);
        stream.Serialize (angularVelocity);
        rigidbody.position = position;
        rigidbody.rotation = rotation;
        rigidbody.velocity = velocity;
        rigidbody.angularVelocity = angularVelocity;
    }
}