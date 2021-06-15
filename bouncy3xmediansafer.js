var config = {
    noopExample: { type: 'noop', label: 'Base Bet' },
    baseBet: { value: 1500, type: 'balance', label: 'Base bet' },
    fixedOrRandom: {
        value: 'fixed', type: 'radio', label: 'Fixed or random waiting time',
        options: {
            fixed: { value: 0, type: 'text', label: 'Fixed cooldown' }
        }
    }
}

engine.median = function (span) {
	let arr = engine.history.slice(0, (span ? Math.max(1, Math.min(50, span)) : 50)).map(a => a.bust).sort((a, b) => { return a - b })
    let mid = arr.length / 2, med = mid % 1 ? arr[mid - 0.5] : (arr[mid - 1] + arr[mid]) / 2;
	return med;
};

engine.average = function (spanner) {
	let arr = engine.history.slice(0, (spanner ? Math.max(1, Math.min(50, spanner)) : 50)).map(a => a.bust).sort((a, b) => { return a - b })
    let ave = arr.reduce((a, b) => a + b, 0)/arr.length;
	return ave;
};

engine.redspotter = function (trainspan) {
    let arr = engine.history.slice(0, (trainspan ? Math.max(1, Math.min(50, trainspan)) : 50)).map(a => a.bust);
    return arr;
}


//Check if overlaps, it is gonna fuck it up.

var currentBet = config.baseBet.value;
var enteredcd = config.fixedOrRandom.options.fixed.value;
var recoverycounter = 0;
var hundrollcounter = 0;
var highrollcounter = 0;
var twohundocounter = 0;
var betupper = 3;
var hundrolls = [1];
var highrolls = [1];
var eightupper = 0;
var currentRedStreak = 0;
var trainsfound = 0;
var longtrainchecker = false;
var cooldown = 0;
var trainlocations = [];
var isBettingNow = false;
var Bettable1 = false;
var Bettable2 = false;
var Bettable3 = false;
var numberOf3xCashedOut = 0;
const StartingBalance = userInfo.balance;
var MultiplierHolder = 3;
var userProfit = 0;
var currentStreakBets = [];

log('FIRST LAUNCH | WELCOME!');

engine.on('GAME_STARTING', function () {
//--------------------------Define Elements----------------------------------------------// 
    let allgames = engine.history.toArray();
    var ProfitCalculator = userInfo.balance;
    let gameInfos = engine.history.first();
    var rowcounter = 0;
    var counter = 0;
    log('');
    log('NEW GAME');
    log("Last Game : " + gameInfos.bust);
    //log(`Last 25 Bust Median : ${engine.median(25)}`);
    log(`Last 50 Bust Median : ${engine.median()}`);
    //log(`Last 25 Bust Average: ${engine.average(25)}`);
    log(`Last 50 Bust Average: ${engine.average()}`);
    log(allgames[0].bust);//See the array and check last 2-3 games and up the bet if those are win
    log('Profit since starting the script: ' + userProfit + ' bits. Got ' + numberOf3xCashedOut + ' times 3x.');
    log('Profit checkpoint count = ' + twohundocounter);
//--------------------------Ongoing RedTrain Checkpoint----------------------------------------------//    
    if (gameInfos.bust < 3) {
        currentRedStreak++;
    } else {
        currentRedStreak = 0;
    }
//--------------------------RedTrain Checkpoint------------------------------------------------//
    for(var i=0; i < allgames.length; i++){
        if(allgames[i].bust >= 100){
            hundrollcounter += 1;
            hundrolls.push(allgames[i].bust);
        }
        if(allgames[i].bust > 30 && allgames[i].bust < 100){
            highrollcounter += 1;
            highrolls.push(allgames[i].bust);
        }
        //log("Entered for");
        if(allgames[i].bust < 3){
            counter += 1;
            var foundlow = true;
            var prev = i-1;
            //log("Found a low bust");
            if(prev != -1 && allgames[prev].bust < 3){
                rowcounter += 1;
                //log("Found 2 low busts in a row");
                if(rowcounter >= 7){
                    longtrainchecker = true;
                    eightupper += 1;
                }
            }   
        }   else if (longtrainchecker != false ){
            log("Found 8 + " + eightupper + " low busts in a row");
            log("Distance to current game = " +  ((i+1) - counter));
            longtrainchecker = false;
            var trlocation = i - counter;
            trainlocations.push(trlocation);
            //log("Trainlocation found : " + trainlocations);
            trainsfound += 1;
            var trainlength = counter;
            eightupper = 0;
            rowcounter = 0;
        } else{
            counter = 0;
            rowcounter = 0;
        }
    }
    for(var x = 0;x < trainlocations.length;x++){
        if(trainlocations[x] > 50 || trainlocations[x] == 0){
            trainlocations.splice(x,1);
        }
    }
//--------------------------Multiplier Drowner Checkpoint----------------------------------------------//

// Calculate the multiplier downer
if (cooldown == 0) {
    
    if(currentRedStreak.length > 7){
        log("Ongoing 7+ redstreak.Waiting 7 rounds.");
        cooldown = 7;
        Bettable1 = false;
    }else if(currentRedStreak < 6 && currentRedStreak>4){
        log("Ongoing low bust streak.2 rounds off.");
        cooldown = 2;
        Bettable1 = false;
    }
    else{
        log("No ongoing 7+ redstreak.");
        Bettable1 = true;
    }
//--------------------------Average and Median Checkpoint----------------------------------------------//
    //log("Passed MedAve Point");
    if(engine.median() <= 1.80 || engine.average() <= 2 ) 
    {
        log("Median is lower than 1.85 and average is lower than 2.");
        log("Playing with 7 cooldown.")
        //log("Waiting 5 rounds.");
        //cooldown = 5;
        Bettable2 = false;
        cooldown = 7;
    }
    if(engine.median() >= 1.80 && engine.median() <= 1.9) 
    {   log("Median (1,85+).Multi (2.2).Default bet is on.");
        Bettable2 = true;
        MultiplierHolder = 2.2;
        if(engine.average() > 2.5){
            if(hundrollcounter < 1 || highrollcounter < 2){
                log("Median(1.85 - 1.9) , Average(2 - 5). Stage 2 = True.");
                config.fixedOrRandom.options.fixed.value = enteredcd;
                Bettable2 = true;
                }
            else{
                log("Highroll or hundroll upped the average.Checking;");
                var sumhigh = highrolls.reduce(function(a,b){return a+b},0);
                var sumhund = hundrolls.reduce(function(a,b){return a+b},0);
                var sumofbigs = (sumhigh + sumhund)/50;
                var newaverage = engine.average - sumofbigs;
                if(newaverage > 2 && (engine.median-0,1) > 1.9){
                    log("MedAve is still good. Stage 2 = True.");
                    log("Median(1.85 - 1.9) , Average(2 - 5). Stage 2 = True.");
                    //config.fixedOrRandom.options.fixed.value = 7;
                    Bettable2 = true;
                    }
                else {
                    if(currentRedStreak >= 3){
                    log("Average is pretty low without them.Streak of 4 or more.Betting.");
                    Bettable2 = true;
                    }else{
                    log("Skipping next round.");
                    cooldown = 1;
                    //Bettable2 = false;
                    }
                }

        }
    }else{
        log("Median (+1.8). Average is too low.Waiting 7 rounds");
        cooldown = 6;
        Bettable2 = false;
    }
}
    if(engine.median() > 1.9 && engine.median() < 2.10) 
    {   log("Median (1,9+).Multi (2.2).Default bet is on.");
        Bettable2 = true;
        MultiplierHolder = 2.2;
        if(engine.average() > 2){
            if(hundrollcounter < 1 || highrollcounter < 2){
                log("Median(1.9 - 2.1) , Average(2 - 8). Multi is 2.2. Stage 2 = True.");
                MultiplierHolder = 2.2;
                Bettable2 = true;
            }else{
                log("Highroll or hundroll upped the average.Checking;");
                var sumhigh = highrolls.reduce(function(a,b){return a+b},0);
                var sumhund = hundrolls.reduce(function(a,b){return a+b},0);
                var sumofbigs = (sumhigh + sumhund)/50;
                var newaverage = engine.average - sumofbigs;
                if(newaverage > 2 && (engine.median-0,1) > 1.9){
                    log("MedAve is still good. Stage 2 = True.");
                    MultiplierHolder = 3;
                    log("Median(1.9 - 2.1) , Average(2 - 8). Multi is 2.2. Stage 2 = True.");
                    Bettable2 = true;
                }else{
                    if(currentRedStreak >= 3){
                        log("Average is pretty low without them.Streak of 4 or more.Betting.");
                        Bettable2 = true;
                    }else{
                        log("Skipping next round.");
                        cooldown = 1;
                    //Bettable2 = false;
                    }
                }
        }
    }else{
        log("Median (+1.9). Average is too low.Waiting 6 rounds");
        cooldown = 5;
        Bettable2 = false;
    }
    }
    if(engine.median() >= 2.10 && engine.median <= 2.35) 
    {   log("Median (2.10+).Default bet is on.");
        Bettable2 = true;
        if(engine.average() > 3){
            if(hundrollcounter < 1 || highrollcounter < 2){
                //add checker for multiple >30 busts
                MultiplierHolder = 3;
                log("Median(2.1 - 2.35) , Average(3 - 10). Multi is 3. Stage 2 = True.");
                Bettable2 = true;
                //low bit strategy needed for this play.No train checks.
            }else{
                log("Highroll or hundroll upped the average.Checking without them:");
                var sumhigh = highrolls.reduce(function(a,b){return a+b},0);
                var sumhund = hundrolls.reduce(function(a,b){return a+b},0);
                var sumofbigs = (sumhigh + sumhund)/50;
                var newaverage = engine.average - sumofbigs;
                if(newaverage > 3){
                    log("Average is still above 4.");
                    MultiplierHolder = 3;
                    log("Median(2.1 - 2.35) , Average(3 - 10). Multi is 3. Stage 2 = True.");
                    Bettable2 = true;
                }else{
                    if(currentRedStreak >= 3){
                        log("Average is pretty low without them.Streak of 4 or more.Betting.");
                        Bettable2 = true;
                    }else{
                        log("Skipping next round.");
                        cooldown = 1;
                        //Bettable2 = false;
                    }
                }
            }
        }else{
            log("Median (+2.10). Average is too low.Waiting 5 rounds");
            cooldown = 4;
            Bettable2 = false;
        }
    }
    if(engine.median() > 2.35) 
    {   log("Median (2.35+).Default bet is on.")
        Bettable2 = true;
        if(engine.average() > 3){
            if(hundrollcounter < 1 || highrollcounter < 2){
                if(trainsfound < 1){
                    log("Median(2.35+) , Average(4+). No highrolls or hundrolls.No train.");
                    log("No redtrains found.");
                    log("2 round cooldown, 3 multi. Stage 2 = True.");
                    MultiplierHolder = 3;
                    cooldown = 2;
                    Bettable2 = true;
                }
                else if (trainsfound >= 1){
                    if(trainlocations[0] > 10){
                        log("Median(2.35+) , Average(4+). No highrolls or hundrolls.");
                        log("Train Found but it is farther away than 30 rounds.");
                        log("Betting with 7 round cooldown, 3 multi. Stage 2 = True.");
                        MultiplierHolder = 3;
                        config.fixedOrRandom.options.fixed.value = 7;
                        Bettable2 = true;
                    }else{
                        log("Train found and it is too close to bet");
                        log("Waiting 2 rounds");
                        cooldown = 2;
                        Bettable2 = false;
                    }
                }
            } else{
                log("Highroll or hundroll upped the average.Checking without them:");
                var sumhigh = highrolls.reduce(function(a,b){return a+b},0);
                var sumhund = hundrolls.reduce(function(a,b){return a+b},0);
                var sumofbigs = (sumhigh + sumhund)/50;
                var newaverage = engine.average - sumofbigs;
                if(newaverage > 3){
                    log("Average is still above 4.");
                    MultiplierHolder = 3;
                    log("Median(2.1 - 2.35) , Average(3 - 10). Betting with 3 multi.");
                    Bettable2 = true;
                }else{
                    if(currentRedStreak >= 3){
                        log("Average is pretty low without them.Streak of 4 or more.Betting.");
                        Bettable2 = true;
                    }else{
                        log("Skipping next round.");
                        cooldown = 1;
                        //Bettable2 = false;
                    }
                }

            }
        }else{
        log("Median (+2.35). Average is too low.Waiting 4 rounds");
        cooldown = 3;
        Bettable2 = false;
    }}
//--------------------------Max Profit Checkpoint----------------------------------------------// 
//log("Passed Profit Checkpoint");
/*
    Profitcheckpoint:
        if((StartingBalance-20000) > ProfitCalculator){
            log("Lost 200 bits.Entering Recovery Mode.");
            /*
            var calcholder=0;
            var downtwo = true;
            log(StartingBalance);
            log(ProfitCalculator);
            calcholder = StartingBalance - ProfitCalculator;
            calcholder = Math.abs(calcholder);
            calcholder = calcholder/20;
            calcholder = Math.ceil(calcholder/100)*100;
            var recoverycounter = 20;
            */
            /*
            StartingBalance -= 20000;
        }
        else if((StartingBalance+20000) < ProfitCalculator){
            var uptwo = true;
            StartingBalance += 20000;
            log("200 bits profit");
        }
        else if((StartingBalance+50000) < ProfitCalculator){
            var upfive = true;
            StartingBalance += 50000;
            log("500 bits profit");
        }
        else{
            log("No need for profit check.");
        }
        */
//--------------------------Redtrain Waypoint----------------------------------------------//
    Redtrainwaypoint:    
        if(trainsfound > 1){    
            if(trainlength > 10 && trainlocations[0] < 15){
                
                log("Found a train longer than 10");
                log("Checking if it is applicable for 2x");
                if(engine.median() > 1.9 && engine.median() < 2.10) 
                {   if(engine.average() > 2 && engine.average() < 8){
                        if(hundrollcounter < 1 || highrollcounter < 2){
                            log("It is.Multiplier is 2.2.Checking for 7 streaks.");
                            MultiplierHolder = 2.2;
                            Bettable3 = true;
                        }
                    }}else{
                        log("It is not.Too close and too big.Checking ongoing.");
                        if(currentRedStreak > 5){
                            cooldown = 6;
                            Bettable3 = false;
                            break Redtrainwaypoint;
                        }else{
                            log("Not ongoing.Betting")
                            Bettable3 = true;
                            break Redtrainwaypoint;
                        }

                    }
            }
            else if(trainlength >= 8 && trainlength <= 10 && trainlocations[0] < 10){
                cooldown = 6;
                Bettable3 = false;
                log("Found a train between 8 and 10 and close.");
                log("Waiting 6 rounds");
                break Redtrainwaypoint;
            }
            else(trainsfound < 8 && trainlocations[0] < 10)
            {
                log("Found a train of 7");
                log("If not ongoing, betting next round.");
                if(currentRedStreak > 9){
                    log("It is ongoing, waiting 3 rounds.");
                    cooldown = 3;
                    Bettable3 = false;
                    break Redtrainwaypoint;
                }else{
                    log("It is not ongoing.Betting")
                    Bettable3 = true;
                    break Redtrainwaypoint;
            }}}else{
                log("No trains found.");
                Bettable3 = true;
            }
//--------------------------Play----------------------------------------------//
    if(Bettable1 != false && Bettable2 != false){
        // This check needs to be weight based and it should effect the multi and the bet.
        // That way it can be more efficient.This is too brute.
        if(Bettable3 != false && betupper > 0){
            currentBet += 100;
            betupper = 0;
        }
        //It is needed for bigger bankrolls.Disabled for now.
        /*if(recoverycounter < 0){
            log("Recovery Mode is on.Betting " + calcholder + "For 20 rounds.")
            currentBet = calcholder;
            recoverycounter -= 1;
        }*/
        engine.bet(currentBet, MultiplierHolder);
        currentStreakBets.push(currentBet);
        log("Betting " + currentBet / 100 + " bits this game.");
        isBettingNow = true;
    }} else {
        log("Cooldown for the next " + cooldown + " games...");
        isBettingNow = false;
    }
});

engine.on('GAME_ENDED', function () {
    let gameInfos = engine.history.first();
    if (isBettingNow) {
        if (!gameInfos.cashedAt) {
            //Lost
            var ProfitCalculator = userInfo.balance;
            log('Lost...');
            ///userProfit -= currentBet;
            if (ProfitCalculator > StartingBalance){
                userProfit = (ProfitCalculator - StartingBalance)/100;
            }else{
                userProfit = -(StartingBalance - ProfitCalculator)/100;
            }
            if (currentStreakBets.length > 1) {
                betupper --;
                currentBet = currentStreakBets[currentStreakBets.length - 1] + currentStreakBets[currentStreakBets.length - 2];
            }
        } else {
            //Won
            var ProfitCalculator = userInfo.balance;
            log('Won!');
            if (ProfitCalculator > StartingBalance){
                userProfit = (ProfitCalculator - StartingBalance )/100;
            }else{
                userProfit = -(StartingBalance - ProfitCalculator)/100;
            }
            ///userProfit += currentBet * 3;0
            cooldown = config.fixedOrRandom.options.fixed.value;
            currentRedStreak = 0;
            betupper = 3;
            currentStreakBets = [];
            currentBet = config.baseBet.value;
            numberOf3xCashedOut++;
        }
    } else {
        if (cooldown > 0) {
            log("Decrementing cooldown...");
            cooldown--;
            log(cooldown + " left");
        }
    }
    if(currentStreakBets.length > 8){
        Bettable1 = false;
        if(gameInfos.bust >= 3){
            Bettable1 = true;
            cooldown = 0;
        }
    }
/*    if(userProfit > 200){
        currentBet = config.baseBet.value;
        MultiplierHolder = 3;
        StartingBalance += userProfit*100;
        userProfit = 0;
        twohundocounter ++;
    }
    */
    log('END GAME');
});