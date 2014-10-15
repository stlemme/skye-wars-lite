
var XML3D = XML3D || {};
var Xflow = Xflow || {};

(function() {


XML3D.shaders.register("deform", {

    vertex : [
        "attribute vec3 position;",
        "attribute vec2 texcoord;",

        "varying vec2 fragTexCoord;",

        "uniform mat4 modelViewProjectionMatrix;",

        "void main(void) {",
        "    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);",
        "    fragTexCoord = texcoord;",
        "}"
    ].join("\n"),

    fragment : [
        "#ifdef GL_ES",
          "precision highp float;",
        "#endif",

        "uniform float iGlobalTime;",
        
        "uniform sampler2D iChannel0;",

        "varying vec2 fragTexCoord;",

        "void main(void) {",
			
			"vec2 p = vec2(-1.0) + 2.0 * fragTexCoord;",
			"vec2 uv;",

			"float r = sqrt( dot(p,p) );",
			
			"float a = atan(p.y,p.x) + 0.75*sin(0.5*r - 0.5*iGlobalTime);",
			
			"float h = (0.5 + 0.5*cos(9.0*a));",

			"float s = smoothstep(0.4,0.5,h);",

			"uv.x = iGlobalTime + 1.0/( r + .1*s);",
			"uv.y = 3.0*a/3.1416;",

			"vec3 col = texture2D(iChannel0, uv).xyz;",
			"//	col *= 1.25;",

			"float ao = smoothstep(0.0,0.3,h) - smoothstep(0.5,1.0,h);",
			"col *= 1.0-0.6*ao*r;",
			"col *= r*r;",
			
			"float alpha = 1.0 - smoothstep(0.7, 0.9, r-0.1*ao);",
			"if (alpha < 0.01) discard;",

			"gl_FragColor = vec4(col, alpha);",
        "}"
    ].join("\n"),
	
	attributes: {
		texcoord: null
	},
	
	hasTransparency: function ( params ) {
		return true;
	},

    uniforms: {
        iGlobalTime: 0.0
    },

    samplers: { 
        iChannel0 : null
    }
});


})();