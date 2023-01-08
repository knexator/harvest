import Effect from "shaku/lib/gfx/effects/effect";

// vertex shader code
const vertexShader = `#version 300 es
in vec3 a_position;
in vec2 a_coord;
in vec4 a_color;

uniform mat4 u_projection;
uniform mat4 u_world;

out vec2 v_texCoord;
out vec4 v_color;

void main(void) {
    gl_Position = u_projection * u_world * vec4(a_position, 1.0);
    gl_PointSize = 1.0;
    v_texCoord = a_coord;
    v_color = a_color;
}`;

// fragment shader code
const fragmentShader = `#version 300 es
precision highp float;

uniform sampler2D u_texture;

in vec2 v_texCoord;
in vec4 v_color;
out vec4 FragColor;

void main(void) {
	vec2 texsize = vec2(textureSize(u_texture, 0));
	vec2 uv_texspace = v_texCoord * texsize;
	vec2 seam = floor(uv_texspace + .5);
	uv_texspace = (uv_texspace - seam) / fwidth(uv_texspace) + seam;
	uv_texspace = clamp(uv_texspace, seam - .5, seam + .5);
	FragColor = texture(u_texture, uv_texspace / texsize)  * v_color;
	// FragColor.rgb *= FragColor.a;
}`;

/*vec4 texture2DAA(sampler2D tex, vec2 uv) {
	vec2 texsize = vec2(textureSize(tex, 0));
	vec2 uv_texspace = uv * texsize;
	vec2 seam = floor(uv_texspace + .5);
	uv_texspace = (uv_texspace - seam) / fwidth(uv_texspace) + seam;
	uv_texspace = clamp(uv_texspace, seam - .5, seam + .5);
	return texture(tex, uv_texspace / texsize);
}*/


export class PixelEffect extends Effect {
	/** @inheritdoc */
	get vertexCode() {
		return vertexShader;
	}

	/** @inheritdoc */
	get fragmentCode() {
		return fragmentShader;
	}

	/** @inheritdoc */
	get uniformTypes() {
		return {
			"u_texture": { type: Effect.UniformTypes.Texture, bind: Effect.UniformBinds.MainTexture },
			"u_projection": { type: Effect.UniformTypes.Matrix, bind: Effect.UniformBinds.Projection },
			"u_world": { type: Effect.UniformTypes.Matrix, bind: Effect.UniformBinds.World },
		};
	}

	/** @inheritdoc */
	get attributeTypes() {
		return {
			"a_position": { size: 3, type: Effect.AttributeTypes.Float, normalize: false, bind: Effect.AttributeBinds.Position },
			"a_coord": { size: 2, type: Effect.AttributeTypes.Float, normalize: false, bind: Effect.AttributeBinds.TextureCoords },
			"a_color": { size: 4, type: Effect.AttributeTypes.Float, normalize: false, bind: Effect.AttributeBinds.Colors },
		};
	}
}



// todo: fix shaku UniformTypes, in:
// declare namespace UniformTypes {
//     const _values: any;
// }