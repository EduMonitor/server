// import { pipeline } from "@huggingface/transformers";

// const classifier = await pipeline("zero-shot-classification");
// const generator = await pipeline("text-generation","HuggingFaceTB/SmolLM2-360M")
// const generated=await generator("In this course, we will teach you how to",{
//     max_new_tokens:50,
//     temperature:0.7
// } )
// const result = await classifier(
//     "This is a course about the Transformers library",
//    ["education", "politics", "business"] // just pass the array
// )
// console.log(generated)
import { pipeline } from "@huggingface/transformers";

const generator = await pipeline("text-generation", "Xenova/distilgpt2");

const generated = await generator(
  "In this course, we will teach you how to",
  { max_new_tokens: 50, temperature: 0.7 }
);

console.log(generated);


