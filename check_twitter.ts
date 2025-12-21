import * as twitter from "twitter-text";
console.log("Available exports:", Object.keys(twitter));
if (twitter.default) {
  console.log("\nDefault export:", Object.keys(twitter.default));
}
