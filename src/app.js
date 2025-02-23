import * as THREE from 'three';
import ASScroll from '@ashthornton/asscroll';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import fragment from './shaders/fragment.glsl';
import vertex from './shaders/vertex.glsl';
// import testTexture from '../img/texture.jpg';
// import * as dat from 'lil-gui'
import gsap from 'gsap'
import barba from '@barba/core';


export default class Sketch {
    constructor(options) {
        this.container = options.domElement;
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.time = 0;
        this.tl = gsap.timeline()

        this.camera = new THREE.PerspectiveCamera(30, this.width / this.height, 10, 1000);
        this.camera.position.z = 600;

        this.camera.fov = 2 * Math.atan((this.height / 2) / 600) * 180 / Math.PI;
        this.imagesAdded = 0;

        this.scene = new THREE.Scene();

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // this.renderer.setPixelRatio(2);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.materials = [];

        this.asscroll = new ASScroll({
            disableRaf: true
        });
        this.asscroll.enable({
            horizontalScroll: !document.body.classList.contains('b-inside')
        })


        /** TRY 01
         * Retrieve the shader code from the HTML
         */
        // this.vertexShader = document.getElementById('vertex-shader').textContent;
        // this.fragmentShader = document.getElementById('fragment-shader').textContent;


        //this.setupSettings()
        this.addObjects()
        this.addClickEvents()
        this.resize()
        this.render();
        this.barba()
        this.setupResize()
    }


    /**
     * Barba
     */
    barba() {
        this.animationRunning = false;
        let that = this;
        barba.init({
            transitions: [{
                name: 'from-home-transition',
                from: {
                    namespace: ["home"]
                },
                leave(data) {
                    that.animationRunning = true;

                    that.asscroll.disable();

                    return gsap.timeline()
                        .to(data.current.container, {
                            opacity: 0.,
                            duration: 0.5
                        })
                },
                enter(data) {
                    that.asscroll = new ASScroll({
                        disableRaf: true,
                        containerElement: data.next.container.querySelector("[asscroll-container]")
                    })
                    that.asscroll.enable({
                        newScrollElements: data.next.container.querySelector('.scroll-wrap')
                    })
                    return gsap.timeline()
                        .from(data.next.container, {
                            opacity: 0.,
                            onComplete: () => {
                                that.container.style.visibility = "hidden";
                                that.animationRunning = false
                            }
                        })
                }
            },
            {
                name: 'from-inside-page-transition',
                from: {
                    namespace: ["inside"]
                },
                leave(data) {
                    that.asscroll.disable();
                    return gsap.timeline()
                        .to('.curtain', {
                            duration: 0.3,
                            y: 0
                        })
                        .to(data.current.container, {
                            opacity: 0.
                        })
                },
                enter(data) {
                    that.asscroll = new ASScroll({
                        disableRaf: true,
                        containerElement: data.next.container.querySelector("[asscroll-container]")
                    })
                    that.asscroll.enable({
                        horizontalScroll: true,
                        newScrollElements: data.next.container.querySelector('.scroll-wrap')
                    })

                    // cleeaning old arrays
                    that.imageStore.forEach(m => {
                        that.scene.remove(m.mesh)
                    })
                    that.imageStore = []
                    that.materials = []
                    that.addObjects();
                    that.resize();
                    that.addClickEvents()
                    that.container.style.visibility = "visible";

                    return gsap.timeline()
                        .to('.curtain', {
                            duration: 0.3,
                            y: "-100%"
                        })
                        .from(data.next.container, {
                            opacity: 0.
                        })
                }
            }
            ]
        });
    }


    /**
     * Click events
     */
    addClickEvents() {
        this.imageStore.forEach(i => {
            i.img.addEventListener('click', () => {
                // console.log('clicked'); // return clicked

                this.tl
                    .to(i.mesh.material.uniforms.uCorners.value, {
                        x: 1,
                        duration: 0.4
                    })
                    .to(i.mesh.material.uniforms.uCorners.value, {
                        y: 1,
                        duration: 0.4
                    }, 0.1)
                    .to(i.mesh.material.uniforms.uCorners.value, {
                        z: 1,
                        duration: 0.4
                    }, 0.2)
                    .to(i.mesh.material.uniforms.uCorners.value, {
                        w: 1,
                        duration: 0.4
                    }, 0.3)
            })
        })
    }


    /**
     * Debug
     */
    setupSettings() {
        this.settings =
        {
            progress: 0
        }

        this.gui = new dat.GUI();
        this.gui.add(this.settings, "progress", 0, 1, 0.001);
    }


    /**
     * Resize
     */
    resize() {
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer.setSize(this.width, this.height);
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();

        this.camera.fov = 2 * Math.atan((this.height / 2) / 600) * 180 / Math.PI;

        this.materials.forEach(m => {
            m.uniforms.uResolution.value.x = this.width;
            m.uniforms.uResolution.value.y = this.height;
        })

        this.imageStore.forEach(i => {
            let bounds = i.img.getBoundingClientRect();
            i.mesh.scale.set(bounds.width, bounds.height, 1);
            i.top = bounds.top;
            i.left = bounds.left + this.asscroll.currentPos;
            i.width = bounds.width;
            i.height = bounds.height;

            i.mesh.material.uniforms.uQuadSize.value.x = bounds.width;
            i.mesh.material.uniforms.uQuadSize.value.y = bounds.height;

            i.mesh.material.uniforms.uTextureSize.value.x = bounds.width;
            i.mesh.material.uniforms.uTextureSize.value.y = bounds.height;
        })
    }

    setupResize() {
        window.addEventListener('resize', this.resize.bind(this));
    }


    /**
     * Add meshes
     */
    addObjects() {
        this.geometry = new THREE.BufferGeometry(1, 1, 100, 100);
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 1.0 },
                uProgress: { value: 0 },
                uTexture: { value: null },
                uTextureSize: { value: new THREE.Vector2(100, 100) },
                uCorners: { value: new THREE.Vector4(0, 0, 0, 0) },
                uResolution: { value: new THREE.Vector2(this.width, this.height) },
                uQuadSize: { value: new THREE.Vector2(300, 300) }
            },
            vertexShader: vertex,
            fragmentShader: fragment,

            // TRY 01
            // vertexShader: this.vertexShader,
            // fragmentShader: this.fragmentShader,

            // TRY 02
            //             vertexShader: `
            //             precision mediump float;
            //             uniform float time;
            //             uniform float uProgress;
            //             uniform vec2 uResolution;
            //             uniform vec2 uQuadSize;
            //             uniform vec4 uCorners;
            //             varying vec2 vSize;
            //
            //             varying vec2 vUv;
            //             void main() {
            //                 float PI = 3.1415926;
            //                 vUv = uv;
            //                 float sine = sin(PI * uProgress);
            //                 float waves = sine*0.1*sin(5.*length(uv) + 15.* uProgress);
            //                 vec4 defaultState = modelMatrix*vec4(position, 1.0);
            //                 vec4 fullScreenState = vec4( position, 1.0 );
            //                 fullScreenState.x *= uResolution.x;
            //                 fullScreenState.y *= uResolution.y;
            //                 fullScreenState.z += uCorners.x;
            //                 float cornersProgress = mix(
            //                     mix(uCorners.z,uCorners.w,uv.x),
            //                     mix(uCorners.x,uCorners.y,uv.x),
            //                     uv.y
            //                 );
            //
            //                 vec4 finalState = mix(defaultState,fullScreenState,cornersProgress);
            //
            //                 vSize = mix(uQuadSize,uResolution,cornersProgress);
            //
            //                 gl_Position = projectionMatrix * viewMatrix * finalState;
            //             }
            //             `,
            //             fragmentShader: `
            //             precision mediump float;
            //             uniform float time;
            //             uniform float uProgress;
            //             uniform vec2 uTextureSize;
            //             uniform sampler2D uTexture;
            //             varying vec2 vUv;
            //
            //             varying vec2 vSize;
            //
            //             vec2 getUV(vec2 uv, vec2 textureSize, vec2 quadSize){
            //                 vec2 tempUV = uv - vec2(0.5);
            //
            //                 float quadAspect = quadSize.x/quadSize.y;
            //                 float textureAspect = textureSize.x/textureSize.y;
            //                 if(quadAspect<textureAspect){
            //                     tempUV = tempUV*vec2(quadAspect/textureAspect,1.);
            //                 } else{
            //                     tempUV = tempUV*vec2(1.,textureAspect/quadAspect);
            //                 }
            //
            //                 tempUV += vec2(0.5);
            //                 return tempUV;
            //             }
            //
            //             void main() {
            //                 vec2 correctUV = getUV(vUv,uTextureSize,vSize);
            //                 vec4 image = texture2D(uTexture,correctUV);
            //                 gl_FragColor = vec4(vUv,0.,1.);
            //                 gl_FragColor = image;
            //             }
            //             `,
        })


        // TRY 03
        // this.material.onBeforeCompile = (shader) => {
        //     console.log('Compiling Vertex Shader');
        //     console.log(shader.vertexShader);
        //     console.log('Compiling Fragment Shader');
        //     console.log(shader.fragmentShader);
        // };


        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.scale.set(300, 300, 1)
        this.scene.add(this.mesh);
        this.mesh.position.x = 300

        this.images = [...document.querySelectorAll('.js-image')];

        this.imageStore = this.images.map(img => {
            let bounds = img.getBoundingClientRect();
            let m = this.material.clone()
            this.materials.push(m);
            let texture = new THREE.Texture(img);
            texture.needsUpdate = true;

            m.uniforms.uTexture.value = texture;

            let mesh = new THREE.Mesh(this.geometry, m);

            this.scene.add(mesh);
            // console.log(mesh.material.uniforms.uTexture.value.source.data); // return .js-image

            mesh.scale.set(bounds.width, bounds.height, 1);

            return {
                img: img,
                mesh: mesh,
                width: bounds.width,
                height: bounds.height,
                top: bounds.top,
                left: bounds.left,
            }
        })
    }


    /**
     * Set position
     */
    setPosition() {
        // console.log(this.asscroll.currentPos)
        if (!this.animationRunning) {
            this.imageStore.forEach(o => {
                o.mesh.position.x = -this.asscroll.currentPos + o.left - this.width / 2 + o.width / 2;
                o.mesh.position.y = -o.top + this.height / 2 - o.height / 2;
            })
        }

    }


    render() {
        this.time += 0.05;
        this.material.uniforms.time.value = this.time;

        this.asscroll.update()
        this.setPosition()
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.render.bind(this))
    }
}

new Sketch({
    domElement: document.getElementById('container')
});