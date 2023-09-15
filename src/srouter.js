const axios = require("axios");
const ethers = require("ethers");
const { Router } = require("@sushiswap/router");
const { Token } = require("@sushiswap/currency");
const { arbAbis, orderbookAbi } = require("./abis");
const {
    sleep,
    getIncome,
    processLps,
    getEthPrice,
    getDataFetcher,
    getActualPrice,
    visualizeRoute,
    build0xQueries,
    bundleTakeOrders,
    getActualClearAmount,
    fetchPoolsForTokenWrapper
} = require("./utils");


const HEADERS = { headers: { "accept-encoding": "null" } };

/**
 * Prepares the bundled orders by getting the best deals from Router and sorting the
 * bundled orders based on the best deals
 *
 * @param {any[]} bundledOrders - The bundled orders array
 * @param {string[]} zeroexQueries - The 0x request queries
 * @param {any} dataFetcher - The DataFetcher instance
 * @param {any} config - The network config data
 * @param {ethers.BigNumber} gasPrice - The network gas price
 * @param {boolean} sort - (optional) Sort based on best deals or not
 */
const prepare = async(bundledOrders, zeroexQueries, dataFetcher, config, gasPrice, sort = true) => {
    try {
        let prices = [];
        if (config.apiKey) {
            console.log(">>> Getting initial prices from 0x");
            const zeroexPromises = [];
            for (let i = 0; i < zeroexQueries.length; i++) {
                zeroexPromises.push(axios.get(zeroexQueries[i].quote, HEADERS));
                await sleep(1000);
            }
            const zeroexResponses = await Promise.allSettled(zeroexPromises);

            for (let i = 0; i < zeroexResponses.length; i++) {
                if (zeroexResponses[i].status == "fulfilled") prices.push([
                    {
                        token: zeroexResponses[i].value.data.buyTokenAddress,
                        rate: zeroexResponses[i].value.data.buyTokenToEthRate
                    },
                    {
                        token: zeroexResponses[i].value.data.sellTokenAddress,
                        rate: zeroexResponses[i].value.data.sellTokenToEthRate
                    }
                ]);
                else {
                    console.log("");
                    console.log(
                        "\x1b[31m%s\x1b[0m",
                        `Could not get prices from 0x for ${
                            zeroexQueries[i].tokens[0]
                        } and ${
                            zeroexQueries[i].tokens[1]
                        }`
                    );
                    console.log(">>> Trying to get prices from Router...");
                    try {
                        if (
                            zeroexQueries[i].tokens[2].toLowerCase() !==
                            config.nativeWrappedToken.address.toLowerCase()
                        ) {
                            const token0ToEthRate = await getEthPrice(
                                config,
                                zeroexQueries[i].tokens[2],
                                zeroexQueries[i].tokens[4],
                                gasPrice,
                                dataFetcher
                            );
                            if (token0ToEthRate !== undefined) prices.push([{
                                token: zeroexQueries[i].tokens[2],
                                rate: token0ToEthRate
                            }]);
                            else throw "noway";
                        }
                        else prices.push([{
                            token: config.nativeWrappedToken.address.toLowerCase(),
                            rate: "1"
                        }]);
                    }
                    catch (e0) {
                        if (e0 === "noway") console.log(
                            "\x1b[31m%s\x1b[0m",
                            `could not find any route for ${zeroexQueries[i].tokens[0]}`
                        );
                        else console.log(
                            "\x1b[31m%s\x1b[0m",
                            `could not get price for ${zeroexQueries[i].tokens[0]} from Router`
                        );
                    }
                    try {
                        if (
                            zeroexQueries[i].tokens[3].toLowerCase() !==
                            config.nativeWrappedToken.address.toLowerCase()
                        ) {
                            const token1ToEthRate = await getEthPrice(
                                config,
                                zeroexQueries[i].tokens[3],
                                zeroexQueries[i].tokens[5],
                                gasPrice,
                                dataFetcher
                            );
                            if (token1ToEthRate !== undefined) prices.push([{
                                token: zeroexQueries[i].tokens[3],
                                rate: token1ToEthRate
                            }]);
                            else throw "noway";
                        }
                        else prices.push([{
                            token: config.nativeWrappedToken.address.toLowerCase(),
                            rate: "1"
                        }]);
                    }
                    catch (e1) {
                        if (e1 === "noway") console.log(
                            "\x1b[31m%s\x1b[0m",
                            `could not find any route for ${zeroexQueries[i].tokens[1]}`
                        );
                        else console.log(
                            "\x1b[31m%s\x1b[0m",
                            `could not get price for ${zeroexQueries[i].tokens[1]} from Router`
                        );
                    }
                }
            }
        }
        else {
            console.log(">>> Getting initial prices from Router");
            for (let i = 0; i < zeroexQueries.length; i++) {
                try {
                    if (
                        zeroexQueries[i].tokens[2].toLowerCase() !==
                        config.nativeWrappedToken.address.toLowerCase()
                    ) {
                        const token0ToEthRate = await getEthPrice(
                            config,
                            zeroexQueries[i].tokens[2],
                            zeroexQueries[i].tokens[4],
                            gasPrice,
                            dataFetcher
                        );
                        if (token0ToEthRate !== undefined) prices.push([{
                            token: zeroexQueries[i].tokens[2],
                            rate: token0ToEthRate
                        }]);
                        else throw "noway";
                    }
                    else prices.push([{
                        token: config.nativeWrappedToken.address.toLowerCase(),
                        rate: "1"
                    }]);
                }
                catch (e0) {
                    if (e0 === "noway") console.log(
                        "\x1b[31m%s\x1b[0m",
                        `could not find any route for ${zeroexQueries[i].tokens[0]}`
                    );
                    else console.log(
                        "\x1b[31m%s\x1b[0m",
                        `could not get price for ${zeroexQueries[i].tokens[0]} from Router`
                    );
                }
                try {
                    if (
                        zeroexQueries[i].tokens[3].toLowerCase() !==
                        config.nativeWrappedToken.address.toLowerCase()
                    ) {
                        const token1ToEthRate = await getEthPrice(
                            config,
                            zeroexQueries[i].tokens[3],
                            zeroexQueries[i].tokens[5],
                            gasPrice,
                            dataFetcher
                        );
                        if (token1ToEthRate !== undefined) prices.push([{
                            token: zeroexQueries[i].tokens[3],
                            rate: token1ToEthRate
                        }]);
                        else throw "noway";
                    }
                    else prices.push([{
                        token: config.nativeWrappedToken.address.toLowerCase(),
                        rate: "1"
                    }]);
                }
                catch (e1) {
                    if (e1 === "noway") console.log(
                        "\x1b[31m%s\x1b[0m",
                        `could not find any route for ${zeroexQueries[i].tokens[1]}`
                    );
                    else console.log(
                        "\x1b[31m%s\x1b[0m",
                        `could not get price for ${zeroexQueries[i].tokens[1]} from Router`
                    );
                }
            }

        }
        prices = prices.flat();
        console.log("");

        bundledOrders.forEach(v => {
            console.log(`Current market price for ${v.buyTokenSymbol}/${v.sellTokenSymbol}:`);
            const sellTokenToEthRate = prices.find(
                e => e.token.toLowerCase() === v.sellToken.toLowerCase()
            )?.rate;
            const buyTokenToEthRate = prices.find(
                e => e.token.toLowerCase() === v.buyToken.toLowerCase()
            )?.rate;
            if (sellTokenToEthRate && buyTokenToEthRate) {
                v.initPrice = ethers.utils.parseUnits(buyTokenToEthRate)
                    .mul(ethers.utils.parseUnits("1"))
                    .div(ethers.utils.parseUnits(sellTokenToEthRate));
                console.log("\x1b[36m%s\x1b[0m", `${ethers.utils.formatEther(v.initPrice)}`);
            }
            else console.log(
                "\x1b[31m%s\x1b[0m",
                "Could not calculate market price for this token pair due to lack of required data!"
            );
            console.log("");
        });
        bundledOrders = bundledOrders.filter(v => v.initPrice !== undefined);
        // bundledOrders.forEach(v => {
        //     v.takeOrders = v.takeOrders.filter(
        //         e => e.ratio !== undefined ? v.initPrice.gte(e.ratio) : true
        //     );
        // });

        if (sort) {
            console.log("\n", ">>> Sorting the pairs based on ...");
            bundledOrders.sort(
                (a, b) => a.initPrice.gt(b.initPrice) ? -1 : a.initPrice.lt(b.initPrice) ? 1 : 0
            );
        }
        return [bundledOrders, prices];
    }
    catch (error) {
        console.log("something went wrong during the process of getting initial prices!");
        console.log(error);
        return [[], []];
    }
};

/**
 * Main function that gets order details from subgraph, bundles the ones that have balance and tries clearing them with specialized router contract
 *
 * @param {object} config - The configuration object
 * @param {any[]} ordersDetails - The order details queried from subgraph
 * @param {string} gasCoveragePercentage - (optional) The percentage of the gas cost to cover on each transaction
 * for it to be considered profitable and get submitted
 * @param {boolean} prioritization - (optional) Prioritize better deals to get cleared first, default is true
 * @returns The report of details of cleared orders
 */
const srouterClear = async(
    config,
    ordersDetails,
    gasCoveragePercentage = "100",
    prioritization = true
) => {
    if (
        gasCoveragePercentage < 0 ||
        !Number.isInteger(Number(gasCoveragePercentage))
    ) throw "invalid gas coverage percentage, must be an integer greater than equal 0";
    if (typeof prioritization !== "boolean") throw "invalid value for 'prioritization'";

    const lps               = processLps(config.lps, config.chainId);
    const dataFetcher       = getDataFetcher(config, lps, !!config.usePublicRpc);
    const signer            = config.signer;
    const arbAddress        = config.arbAddress;
    const orderbookAddress  = config.orderbookAddress;
    const maxProfit         = config.maxProfit;
    const maxRatio          = config.maxRatio;
    const api               = config.zeroEx.apiUrl;
    const nativeToken       = config.nativeWrappedToken;

    if (config.apiKey) HEADERS.headers["0x-api-key"] = config.apiKey;

    // instantiating arb contract
    const arb = new ethers.Contract(arbAddress, arbAbis["srouter"], signer);

    // instantiating orderbook contract
    const orderbook = new ethers.Contract(orderbookAddress, orderbookAbi, signer);

    let gasPrice = await signer.provider.getGasPrice();

    console.log(
        "------------------------- Starting Clearing Process -------------------------",
        "\n"
    );
    console.log("\x1b[33m%s\x1b[0m", Date());
    console.log("Arb Contract Address: " , arbAddress);
    console.log("OrderBook Contract Address: " , orderbookAddress, "\n");

    const initPriceQueries = [];
    let bundledOrders = [];
    let ethPrices = [];
    if (ordersDetails.length) {
        console.log(
            "------------------------- Bundling Orders -------------------------", "\n"
        );
        bundledOrders = await bundleTakeOrders(ordersDetails, orderbook, arb, maxProfit);
        for (let i = 0; i < bundledOrders.length; i++) {
            build0xQueries(
                api,
                initPriceQueries,
                bundledOrders[i].sellToken,
                bundledOrders[i].sellTokenDecimals,
                bundledOrders[i].sellTokenSymbol
            );
            build0xQueries(
                api,
                initPriceQueries,
                bundledOrders[i].buyToken,
                bundledOrders[i].buyTokenDecimals,
                bundledOrders[i].buyTokenSymbol
            );
        }
        if (Array.isArray(initPriceQueries[initPriceQueries.length - 1])) {
            initPriceQueries[initPriceQueries.length - 1] = {
                quote: `${
                    api
                }swap/v1/price?buyToken=${
                    nativeToken.address.toLowerCase()
                }&sellToken=${
                    initPriceQueries[initPriceQueries.length - 1][0]
                }&sellAmount=${
                    "1" + "0".repeat(initPriceQueries[initPriceQueries.length - 1][1])
                }`,
                tokens: [
                    nativeToken.symbol,
                    initPriceQueries[initPriceQueries.length - 1][2],
                    nativeToken.address.toLowerCase(),
                    initPriceQueries[initPriceQueries.length - 1][0],
                    nativeToken.decimals,
                    initPriceQueries[initPriceQueries.length - 1][1],
                ]
            };
        }
        console.log(
            "------------------------- Getting Best Deals From RouteProcessor3 -------------------------",
            "\n"
        );
        [ bundledOrders, ethPrices ] = await prepare(
            bundledOrders,
            initPriceQueries,
            dataFetcher,
            config,
            gasPrice,
            prioritization
        );
    }
    else {
        console.log("No orders found, exiting...", "\n");
        return;
    }

    if (!bundledOrders.length) {
        console.log("Could not find any order to clear for current market price, exiting...", "\n");
        return;
    }

    console.log(
        "------------------------- Trying To Clear Bundled Orders -------------------------",
        "\n"
    );

    const report = [];
    for (let i = 0; i < bundledOrders.length; i++) {
        try {
            console.log(
                `------------------------- Trying To Clear ${
                    bundledOrders[i].buyTokenSymbol
                }/${
                    bundledOrders[i].sellTokenSymbol
                } -------------------------`,
                "\n"
            );
            console.log(`Buy Token Address: ${bundledOrders[i].buyToken}`);
            console.log(`Sell Token Address: ${bundledOrders[i].sellToken}`, "\n");

            if (!bundledOrders[i].takeOrders.length) console.log(
                "All orders of this token pair have empty vault balance, skipping...",
                "\n"
            );
            else {
                const fromToken = new Token({
                    chainId: config.chainId,
                    decimals: bundledOrders[i].sellTokenDecimals,
                    address: bundledOrders[i].sellToken,
                    symbol: bundledOrders[i].sellTokenSymbol
                });
                const toToken = new Token({
                    chainId: config.chainId,
                    decimals: bundledOrders[i].buyTokenDecimals,
                    address: bundledOrders[i].buyToken,
                    symbol: bundledOrders[i].buyTokenSymbol
                });

                const obSellTokenBalance = ethers.BigNumber.from(await signer.call({
                    data: "0x70a08231000000000000000000000000" + orderbookAddress.slice(2),
                    to: bundledOrders[i].sellToken
                }));
                const quoteChunks = obSellTokenBalance.div("5");
                let ethPrice;

                for (let j = 5; j > 0; j--) {
                    const maximumInput = j === 5 ? obSellTokenBalance : quoteChunks.mul(j);
                    const maximumInputFixed = maximumInput.mul(
                        "1" + "0".repeat(18 - bundledOrders[i].sellTokenDecimals)
                    );

                    console.log(`>>> Trying to arb with ${
                        ethers.utils.formatEther(maximumInputFixed)
                    } ${
                        bundledOrders[i].sellTokenSymbol
                    } as maximum input`);
                    console.log(">>> Getting best route", "\n");
                    await fetchPoolsForTokenWrapper(dataFetcher, fromToken, toToken);
                    const pcMap = dataFetcher.getCurrentPoolCodeMap(
                        fromToken,
                        toToken
                    );
                    gasPrice = await signer.provider.getGasPrice();
                    const route = Router.findBestRoute(
                        pcMap,
                        config.chainId,
                        fromToken,
                        maximumInput,
                        toToken,
                        gasPrice.toNumber(),
                        // 30e9,
                        // providers,
                        // poolFilter
                    );
                    if (route.status == "NoWay") console.log(
                        "could not find any route for this token pair with this certain amount"
                    );
                    else {
                        const rateFixed = route.amountOutBN.mul(
                            "1" + "0".repeat(18 - bundledOrders[i].buyTokenDecimals)
                        );
                        const price = rateFixed.mul("1" + "0".repeat(18)).div(maximumInputFixed);
                        console.log(`Current best route price for this token pair: ${ethers.utils.formatEther(price)}`, "\n");
                        console.log(">>> Route portions: ", "\n");
                        visualizeRoute(fromToken, toToken, route.legs).forEach(
                            v => console.log("\x1b[36m%s\x1b[0m", v)
                        );
                        console.log("");

                        const rpParams = Router.routeProcessor2Params(
                            pcMap,
                            route,
                            fromToken,
                            toToken,
                            arb.address,
                            config.routeProcessor3Address,
                            // permits
                            // "0.005"
                        );
                        const takeOrdersConfigStruct = {
                            minimumInput: ethers.constants.One,
                            maximumInput,
                            maximumIORatio: maxRatio ? ethers.constants.MaxUint256 : price,
                            orders: bundledOrders[i].takeOrders.map(v => v.takeOrder),
                            data: ethers.utils.defaultAbiCoder.encode(
                                ["bytes"],
                                [rpParams.routeCode]
                            )
                        };

                        // building and submit the transaction
                        try {
                            ethPrice = ethPrices.find(v =>
                                v.token.toLowerCase() === bundledOrders[i].buyToken.toLowerCase()
                            )?.rate;
                            if (ethPrice === undefined) console.log("can not get ETH price, skipping...", "\n");
                            else {
                                const rawtx = {
                                    data: arb.interface.encodeFunctionData("arb", [takeOrdersConfigStruct, "0"]),
                                    to: arb.address,
                                    gasPrice
                                };
                                console.log("Block Number: " + await signer.provider.getBlockNumber(), "\n");
                                let gasLimit;
                                try {
                                    gasLimit = await signer.estimateGas(rawtx);
                                }
                                catch {
                                    // console.log(err);
                                    throw "nomatch";
                                }
                                gasLimit = gasLimit.mul("112").div("100");
                                rawtx.gasLimit = gasLimit;
                                const gasCost = gasLimit.mul(gasPrice);
                                // const maxEstimatedProfit = estimateProfit(
                                //     ethers.utils.formatEther(bundledOrders[i].initPrice),
                                //     ethPrice,
                                //     bundledOrders[i],
                                //     gasCost,
                                //     gasCoveragePercentage
                                // ).div(
                                //     "1" + "0".repeat(18 - bundledOrders[i].buyTokenDecimals)
                                // );
                                // console.log(`Max Estimated Profit: ${
                                //     ethers.utils.formatUnits(
                                //         maxEstimatedProfit,
                                //         bundledOrders[i].buyTokenDecimals
                                //     )
                                // } ${bundledOrders[i].buyTokenSymbol}`, "\n");

                                // if (maxEstimatedProfit.isNegative()) console.log(
                                //     ">>> Skipping because estimated negative profit for this token pair",
                                //     "\n"
                                // );
                                // else {
                                console.log(">>> Trying to submit the transaction...", "\n");
                                const gasCostInToken = ethers.utils.parseUnits(
                                    ethPrice
                                ).mul(
                                    gasCost
                                ).div(
                                    "1" + "0".repeat(
                                        36 - bundledOrders[i].buyTokenDecimals
                                    )
                                );
                                if (gasCoveragePercentage !== "0") {
                                    const headroom = (
                                        Number(gasCoveragePercentage) * 1.2
                                    ).toFixed();
                                    rawtx.data = arb.interface.encodeFunctionData(
                                        "arb",
                                        [
                                            takeOrdersConfigStruct,
                                            gasCostInToken.mul(headroom).div(100)
                                        ]
                                    );
                                    try {
                                        await signer.estimateGas(rawtx);
                                    }
                                    catch {
                                        // console.log(err);
                                        throw "dryrun";
                                    }
                                }
                                rawtx.data = arb.interface.encodeFunctionData(
                                    "arb",
                                    [
                                        takeOrdersConfigStruct,
                                        gasCostInToken.mul(gasCoveragePercentage).div(100)
                                    ]
                                );
                                console.log("Block Number: " + await signer.provider.getBlockNumber(), "\n");
                                const tx = await signer.sendTransaction(rawtx);

                                console.log("\x1b[33m%s\x1b[0m", config.explorer + "tx/" + tx.hash, "\n");
                                console.log(
                                    ">>> Transaction submitted successfully to the network, waiting for transaction to mine...",
                                    "\n"
                                );

                                try {
                                    const receipt = await tx.wait();
                                    // console.log(receipt);
                                    if (receipt.status === 1) {
                                        const clearActualAmount = getActualClearAmount(
                                            arbAddress,
                                            orderbookAddress,
                                            receipt
                                        );
                                        const income = getIncome(signer, receipt);
                                        const clearActualPrice = getActualPrice(
                                            receipt,
                                            orderbookAddress,
                                            arbAddress,
                                            clearActualAmount.mul("1" + "0".repeat(
                                                18 - bundledOrders[i].sellTokenDecimals
                                            )),
                                            bundledOrders[i].buyTokenDecimals
                                        );
                                        const actualGasCost = ethers.BigNumber.from(
                                            receipt.effectiveGasPrice
                                        ).mul(receipt.gasUsed);
                                        const actualGasCostInToken = ethers.utils.parseUnits(
                                            ethPrice
                                        ).mul(
                                            actualGasCost
                                        ).div(
                                            "1" + "0".repeat(
                                                36 - bundledOrders[i].buyTokenDecimals
                                            )
                                        );
                                        const netProfit = income
                                            ? income.sub(actualGasCostInToken)
                                            : undefined;

                                        console.log(
                                            "\x1b[36m%s\x1b[0m",
                                            `Clear Initial Price: ${ethers.utils.formatEther(bundledOrders[i].initPrice)}`
                                        );
                                        console.log("\x1b[36m%s\x1b[0m", `Clear Actual Price: ${clearActualPrice}`);
                                        console.log("\x1b[36m%s\x1b[0m", `Clear Amount: ${
                                            ethers.utils.formatUnits(
                                                clearActualAmount,
                                                bundledOrders[i].sellTokenDecimals
                                            )
                                        } ${bundledOrders[i].sellTokenSymbol}`);
                                        console.log("\x1b[36m%s\x1b[0m", `Consumed Gas: ${
                                            ethers.utils.formatEther(actualGasCost)
                                        } ${
                                            config.nativeToken.symbol
                                        }`, "\n");
                                        if (income) {
                                            console.log("\x1b[35m%s\x1b[0m", `Gross Income: ${ethers.utils.formatUnits(
                                                income,
                                                bundledOrders[i].buyTokenDecimals
                                            )} ${bundledOrders[i].buyTokenSymbol}`);
                                            console.log("\x1b[35m%s\x1b[0m", `Net Profit: ${ethers.utils.formatUnits(
                                                netProfit,
                                                bundledOrders[i].buyTokenDecimals
                                            )} ${bundledOrders[i].buyTokenSymbol}`, "\n");
                                        }

                                        report.push({
                                            transactionHash: receipt.transactionHash,
                                            tokenPair:
                                                bundledOrders[i].buyTokenSymbol +
                                                "/" +
                                                bundledOrders[i].sellTokenSymbol,
                                            buyToken: bundledOrders[i].buyToken,
                                            buyTokenDecimals: bundledOrders[i].buyTokenDecimals,
                                            sellToken: bundledOrders[i].sellToken,
                                            sellTokenDecimals: bundledOrders[i].sellTokenDecimals,
                                            clearedAmount: clearActualAmount.toString(),
                                            clearPrice: ethers.utils.formatEther(
                                                bundledOrders[i].initPrice
                                            ),
                                            clearActualPrice,
                                            // maxEstimatedProfit,
                                            gasUsed: receipt.gasUsed,
                                            gasCost: actualGasCost,
                                            income,
                                            netProfit,
                                            clearedOrders: bundledOrders[i].takeOrders.map(
                                                v => v.id
                                            ),
                                        });
                                        j = 0;
                                    }
                                    else if (j > 1) console.log(
                                        `could not clear with ${ethers.utils.formatEther(
                                            maximumInputFixed
                                        )} ${
                                            bundledOrders[i].sellTokenSymbol
                                        } as max input, trying with lower amount...`
                                    );
                                    else console.log("could not arb this pair");
                                }
                                catch (error) {
                                    console.log("\x1b[31m%s\x1b[0m", ">>> Transaction execution failed due to:");
                                    console.log(error, "\n");
                                    if (j > 1) console.log(
                                        "\x1b[34m%s\x1b[0m",
                                        `could not clear with ${ethers.utils.formatEther(
                                            maximumInputFixed
                                        )} ${
                                            bundledOrders[i].sellTokenSymbol
                                        } as max input, trying with lower amount...`, "\n"
                                    );
                                    else console.log("\x1b[34m%s\x1b[0m", "could not arb this pair", "\n");
                                }
                            }
                        }
                        catch (error) {
                            if (error !== "nomatch" && error !== "dryrun") {
                                console.log("\x1b[31m%s\x1b[0m", ">>> Transaction failed due to:");
                                console.log(error, "\n");
                                // reason, code, method, transaction, error, stack, message
                            }
                            if (j > 1) console.log(
                                "\x1b[34m%s\x1b[0m",
                                `could not clear with ${ethers.utils.formatEther(
                                    maximumInputFixed
                                )} ${
                                    bundledOrders[i].sellTokenSymbol
                                } as max input, trying with lower amount...`, "\n"
                            );
                            else console.log("\x1b[34m%s\x1b[0m", "could not arb this pair", "\n");
                        }
                    }
                }
            }
        }
        catch (error) {
            console.log("\x1b[31m%s\x1b[0m", ">>> Something went wrong, reason:", "\n");
            console.log(error);
        }
    }
    return report;
};

module.exports = {
    srouterClear
};