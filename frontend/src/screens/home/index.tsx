import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState, useCallback, createRef } from "react";
import axios from "axios";
import Draggable from "react-draggable";
import { SWATCHES } from "@/constants";

interface GeneratedResult {
	expression: string;
	answer: string;
}

interface Response {
	expr: string;
	result: string;
	assign: boolean;
}

interface LatexItem {
	content: string;
	position: { x: number; y: number };
}

export default function Home() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [draggableRefs, setDraggableRefs] = useState<
		React.RefObject<HTMLDivElement>[]
	>([]);
	const [isDrawing, setIsDrawing] = useState(false);
	const [color, setColor] = useState("rgb(255, 255, 255)");
	const [reset, setReset] = useState(false);
	const [dictOfVars, setDictOfVars] = useState({});
	const [result, setResult] = useState<GeneratedResult>();
	const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
	const [latexExpressions, setLatexExpressions] = useState<LatexItem[]>([]);

	// Update draggableRefs when latexExpressions changes
	useEffect(() => {
		// Create refs for new expressions if needed
		if (latexExpressions.length > draggableRefs.length) {
			const newRefs = [...draggableRefs];
			for (let i = draggableRefs.length; i < latexExpressions.length; i++) {
				newRefs.push(createRef<HTMLDivElement>());
			}
			setDraggableRefs(newRefs);
		}
	}, [latexExpressions, draggableRefs]);

	const renderLatexToCanvas = useCallback(
		(expression: string, answer: string) => {
			const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
			setLatexExpressions((prev) => [
				...prev,
				{
					content: latex,
					position: {
						x: latexPosition.x,
						y: latexPosition.y + prev.length * 40,
					},
				},
			]);

			const canvas = canvasRef.current;
			if (canvas) {
				const ctx = canvas.getContext("2d");
				if (ctx) {
					ctx.clearRect(0, 0, canvas.width, canvas.height);
				}
			}
		},
		[latexPosition]
	);

	useEffect(() => {
		if (latexExpressions.length > 0 && window.MathJax) {
			setTimeout(() => {
				window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
			}, 0);
		}
	}, [latexExpressions]);

	useEffect(() => {
		if (result) {
			renderLatexToCanvas(result.expression, result.answer);
		}
	}, [result, renderLatexToCanvas]);

	useEffect(() => {
		if (reset) {
			resetCanvas();
			setLatexExpressions([]);
			setResult(undefined);
			setDictOfVars({});
			setReset(false);
		}
	}, [reset]);

	useEffect(() => {
		const canvas = canvasRef.current;

		const resizeCanvas = () => {
			if (canvas) {
				canvas.width = window.innerWidth;
				canvas.height = window.innerHeight - canvas.offsetTop;
			}
		};

		resizeCanvas();
		window.addEventListener("resize", resizeCanvas);

		const script = document.createElement("script");
		script.src =
			"https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
		script.async = true;
		document.head.appendChild(script);

		script.onload = () => {
			window.MathJax.Hub.Config({
				tex2jax: {
					inlineMath: [
						["$", "$"],
						["\\(", "\\)"],
					],
				},
			});
		};

		return () => {
			document.head.removeChild(script);
			window.removeEventListener("resize", resizeCanvas);
		};
	}, []);

	const resetCanvas = () => {
		const canvas = canvasRef.current;
		if (canvas) {
			const ctx = canvas.getContext("2d");
			if (ctx) {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
			}
		}
	};

	const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (canvas) {
			canvas.style.background = "black";
			const ctx = canvas.getContext("2d");
			if (ctx) {
				ctx.beginPath();
				ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
				setIsDrawing(true);
			}
		}
	};

	const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		const canvas = canvasRef.current;
		if (canvas) {
			const ctx = canvas.getContext("2d");
			if (ctx) {
				ctx.strokeStyle = color;
				ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
				ctx.stroke();
			}
		}
	};

	const stopDrawing = () => {
		setIsDrawing(false);
	};

	const runRoute = async () => {
		const canvas = canvasRef.current;
		if (canvas) {
			const response = await axios({
				method: "post",
				url: `${import.meta.env.VITE_API_URL}/calculate`,
				data: {
					image: canvas.toDataURL("image/png"),
					dict_of_vars: dictOfVars,
				},
			});

			const resp = await response.data;
			console.log("Response", resp);
			resp.data.forEach((data: Response) => {
				if (data.assign === true) {
					setDictOfVars((prev) => ({
						...prev,
						[data.expr]: data.result,
					}));
				}
			});

			const ctx = canvas.getContext("2d");
			const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
			let minX = canvas.width,
				minY = canvas.height,
				maxX = 0,
				maxY = 0;

			for (let y = 0; y < canvas.height; y++) {
				for (let x = 0; x < canvas.width; x++) {
					const i = (y * canvas.width + x) * 4;
					if (imageData.data[i + 3] > 0) {
						minX = Math.min(minX, x);
						minY = Math.min(minY, y);
						maxX = Math.max(maxX, x);
						maxY = Math.max(maxY, y);
					}
				}
			}

			const centerX = (minX + maxX) / 2;
			const centerY = (minY + maxY) / 2;

			setLatexPosition({ x: centerX, y: centerY });

			resp.data.forEach((data: Response) => {
				setTimeout(() => {
					setResult({
						expression: data.expr,
						answer: data.result,
					});
				}, 1000);
			});
		}
	};

	return (
		<>
			<div className="grid grid-cols-3 gap-2">
				<Button
					onClick={() => setReset(true)}
					className="z-20 bg-black text-white"
					variant="default"
					color="black"
				>
					Reset
				</Button>
				<Group className="z-20">
					{SWATCHES.map((swatch) => (
						<ColorSwatch
							key={swatch}
							color={swatch}
							onClick={() => setColor(swatch)}
						/>
					))}
				</Group>
				<Button
					onClick={runRoute}
					className="z-20 bg-black text-white"
					variant="default"
					color="white"
				>
					Run
				</Button>
			</div>

			<canvas
				ref={canvasRef}
				id="canvas"
				className="absolute top-0 left-0 w-full h-full"
				onMouseDown={startDrawing}
				onMouseMove={draw}
				onMouseUp={stopDrawing}
				onMouseOut={stopDrawing}
			/>

			{latexExpressions.map((item, index) => (
				<Draggable
					key={index}
					nodeRef={draggableRefs[index]}
					position={item.position}
					onStop={(e, data) => {
						setLatexExpressions((prev) =>
							prev.map((expr, i) =>
								i === index
									? { ...expr, position: { x: data.x, y: data.y } }
									: expr
							)
						);
					}}
				>
					<div
						ref={draggableRefs[index]}
						className="absolute p-2 text-white rounded shadow-md"
					>
						<div className="latex-content">{item.content}</div>
					</div>
				</Draggable>
			))}
		</>
	);
}
