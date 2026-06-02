function getCADObjectsForSaving() {
  const objects = window.cadObjects || [];

  return objects.map((object) => {
    let color = "#ffffff";

    if (object.material && object.material.color) {
      color = "#" + object.material.color.getHexString();
    }

    return {
      id: object.userData?.id || "",
      name: object.name || "Unnamed Object",
      type: object.userData?.type || "unknown",

      position: {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z
      },

      rotation: {
        x: object.rotation.x,
        y: object.rotation.y,
        z: object.rotation.z
      },

      scale: {
        x: object.scale.x,
        y: object.scale.y,
        z: object.scale.z
      },

      color: color
    };
  });
}