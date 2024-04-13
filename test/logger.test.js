const { assert } = require("chai");
const { Resource } = require("@opentelemetry/resources");
const { diag, DiagConsoleLogger, DiagLogLevel } = require("@opentelemetry/api");
const { SEMRESATTRS_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");
const { BasicTracerProvider, BatchSpanProcessor, ConsoleSpanExporter } = require("@opentelemetry/sdk-trace-base");

describe("Test logger", async function () {
    it("should log with no error", async function () {
        // hook to stdout
        let stdoutText = "";
        process.stdout.write = (function(write) {
            return function(string) {
                stdoutText += string;
                write.apply(process.stdout, arguments);
            };
        })(process.stdout.write);

        // set otel diager and tracer
        diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
        const exporter = new ConsoleSpanExporter();
        const provider = new BasicTracerProvider({
            resource: new Resource({
                [SEMRESATTRS_SERVICE_NAME]: "logger-test"
            }),
        });
        provider.addSpanProcessor(new BatchSpanProcessor(exporter));
        const tracer = provider.getTracer("tracer");

        // do some otel spans
        const testSpan = tracer.startSpan("span-test");
        testSpan.setAttribute("some-attr", JSON.stringify({ someProp: "some-val" }));

        // do some normal logs
        console.log({ someObj: 123 });
        console.log("some text");

        // end otel span
        testSpan.end();

        // should not include any errors
        assert.notInclude(stdoutText, "Maximum call stack size exceeded");
        assert.notInclude(stdoutText, "Error");
        assert.include(stdoutText, "@opentelemetry/api: Registered a global for diag v1.8.0.");
        assert.include(stdoutText, "some text");
        // 123 is colored
        assert.include(stdoutText, "{ someObj: \u001b[33m123\u001b[39m }");
    });
});