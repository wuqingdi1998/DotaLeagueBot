ALTER TABLE tournaments
    ADD COLUMN IF NOT EXISTS season_activity_points_note TEXT;

DO $migration$
DECLARE
    duplicate_active_names TEXT;
BEGIN
    CREATE TEMP TABLE season3_player_source ON COMMIT DROP AS
    SELECT *
    FROM jsonb_to_recordset($season3_players$
[{"nickname":"Besst","section":"active","rank":1,"reason":null,"archiveId":"-8500000000000001","snapshot":{"playedRounds":12,"wins":5,"draws":7,"losses":0,"adjustmentPoints":0,"activityPoints":4,"points":21,"winRate":0.7083333333,"supportsActivityPoints":true,"rounds":{"3":{"points":2,"outcome":"win"},"4":{"points":2,"outcome":"win"},"5":{"points":1,"outcome":"draw"},"6":{"points":2,"outcome":"win"},"7":{"points":1,"outcome":"draw"},"8":{"points":2,"outcome":"win"},"9":{"points":1,"outcome":"draw"},"10":{"points":2,"outcome":"win"},"11":{"points":1,"outcome":"draw"},"12":{"points":1,"outcome":"draw"},"13":{"points":1,"outcome":"draw"},"14":{"points":1,"outcome":"draw"}}}},{"nickname":"Bel1eve","section":"active","rank":2,"reason":null,"archiveId":"-8500000000000002","snapshot":{"playedRounds":12,"wins":5,"draws":5,"losses":2,"adjustmentPoints":0,"activityPoints":4,"points":19,"winRate":0.625,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":2,"outcome":"win"},"3":{"points":1,"outcome":"draw"},"4":{"points":0,"outcome":"loss"},"5":{"points":1,"outcome":"draw"},"6":{"points":2,"outcome":"win"},"7":{"points":2,"outcome":"win"},"8":{"points":0,"outcome":"loss"},"11":{"points":1,"outcome":"draw"},"12":{"points":2,"outcome":"win"},"13":{"points":1,"outcome":"draw"},"14":{"points":2,"outcome":"win"}}}},{"nickname":"frokeng","section":"active","rank":3,"reason":null,"archiveId":"-8500000000000003","snapshot":{"playedRounds":12,"wins":3,"draws":9,"losses":0,"adjustmentPoints":0,"activityPoints":4,"points":19,"winRate":0.625,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":2,"outcome":"win"},"3":{"points":2,"outcome":"win"},"4":{"points":1,"outcome":"draw"},"5":{"points":1,"outcome":"draw"},"7":{"points":1,"outcome":"draw"},"9":{"points":1,"outcome":"draw"},"10":{"points":2,"outcome":"win"},"11":{"points":1,"outcome":"draw"},"12":{"points":1,"outcome":"draw"},"13":{"points":1,"outcome":"draw"},"14":{"points":1,"outcome":"draw"}}}},{"nickname":"nikdorbaz","section":"active","rank":4,"reason":null,"archiveId":"-8500000000000004","snapshot":{"playedRounds":12,"wins":4,"draws":5,"losses":3,"adjustmentPoints":0,"activityPoints":4,"points":17,"winRate":0.5416666667,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":2,"outcome":"win"},"3":{"points":2,"outcome":"win"},"4":{"points":0,"outcome":"loss"},"5":{"points":1,"outcome":"draw"},"6":{"points":1,"outcome":"draw"},"7":{"points":1,"outcome":"draw"},"9":{"points":2,"outcome":"win"},"11":{"points":2,"outcome":"win"},"12":{"points":0,"outcome":"loss"},"13":{"points":1,"outcome":"draw"},"14":{"points":0,"outcome":"loss"}}}},{"nickname":"whiteriver","section":"active","rank":5,"reason":null,"archiveId":"-8500000000000005","snapshot":{"playedRounds":10,"wins":5,"draws":3,"losses":2,"adjustmentPoints":0,"activityPoints":2,"points":15,"winRate":0.65,"supportsActivityPoints":true,"rounds":{"4":{"points":2,"outcome":"win"},"5":{"points":1,"outcome":"draw"},"6":{"points":1,"outcome":"draw"},"7":{"points":1,"outcome":"draw"},"8":{"points":2,"outcome":"win"},"9":{"points":2,"outcome":"win"},"10":{"points":2,"outcome":"win"},"11":{"points":0,"outcome":"loss"},"12":{"points":2,"outcome":"win"},"14":{"points":0,"outcome":"loss"}}}},{"nickname":"Decadence","section":"active","rank":6,"reason":null,"archiveId":"-8500000000000006","snapshot":{"playedRounds":10,"wins":4,"draws":5,"losses":1,"adjustmentPoints":0,"activityPoints":2,"points":15,"winRate":0.65,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":2,"outcome":"win"},"3":{"points":0,"outcome":"loss"},"4":{"points":1,"outcome":"draw"},"5":{"points":1,"outcome":"draw"},"7":{"points":1,"outcome":"draw"},"8":{"points":1,"outcome":"draw"},"10":{"points":2,"outcome":"win"},"12":{"points":2,"outcome":"win"},"14":{"points":2,"outcome":"win"}}}},{"nickname":"Bot Fergus","section":"active","rank":7,"reason":null,"archiveId":"-8500000000000007","snapshot":{"playedRounds":13,"wins":2,"draws":7,"losses":4,"adjustmentPoints":0,"activityPoints":4,"points":15,"winRate":0.4230769231,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":2,"outcome":"win"},"3":{"points":1,"outcome":"draw"},"4":{"points":1,"outcome":"draw"},"5":{"points":1,"outcome":"draw"},"6":{"points":0,"outcome":"loss"},"7":{"points":1,"outcome":"draw"},"8":{"points":1,"outcome":"draw"},"9":{"points":0,"outcome":"loss"},"10":{"points":0,"outcome":"loss"},"11":{"points":0,"outcome":"loss"},"12":{"points":2,"outcome":"win"},"13":{"points":1,"outcome":"draw"}}}},{"nickname":"Immersion","section":"active","rank":8,"reason":null,"archiveId":"-8500000000000008","snapshot":{"playedRounds":12,"wins":2,"draws":7,"losses":3,"adjustmentPoints":0,"activityPoints":4,"points":15,"winRate":0.4583333333,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":2,"outcome":"win"},"3":{"points":0,"outcome":"loss"},"5":{"points":1,"outcome":"draw"},"6":{"points":0,"outcome":"loss"},"7":{"points":1,"outcome":"draw"},"8":{"points":0,"outcome":"loss"},"9":{"points":1,"outcome":"draw"},"10":{"points":2,"outcome":"win"},"11":{"points":1,"outcome":"draw"},"12":{"points":1,"outcome":"draw"},"13":{"points":1,"outcome":"draw"}}}},{"nickname":"Mapes","section":"active","rank":9,"reason":null,"archiveId":"-8500000000000009","snapshot":{"playedRounds":12,"wins":0,"draws":10,"losses":2,"adjustmentPoints":0,"activityPoints":4,"points":14,"winRate":0.4166666667,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":1,"outcome":"draw"},"3":{"points":1,"outcome":"draw"},"4":{"points":0,"outcome":"loss"},"5":{"points":1,"outcome":"draw"},"7":{"points":1,"outcome":"draw"},"9":{"points":1,"outcome":"draw"},"10":{"points":0,"outcome":"loss"},"11":{"points":1,"outcome":"draw"},"12":{"points":1,"outcome":"draw"},"13":{"points":1,"outcome":"draw"},"14":{"points":1,"outcome":"draw"}}}},{"nickname":"Пушинка","section":"active","rank":10,"reason":null,"archiveId":"-8500000000000010","snapshot":{"playedRounds":8,"wins":4,"draws":2,"losses":2,"adjustmentPoints":0,"activityPoints":2,"points":12,"winRate":0.625,"supportsActivityPoints":true,"rounds":{"6":{"points":1,"outcome":"draw"},"7":{"points":1,"outcome":"draw"},"8":{"points":2,"outcome":"win"},"9":{"points":0,"outcome":"loss"},"10":{"points":2,"outcome":"win"},"11":{"points":0,"outcome":"loss"},"12":{"points":2,"outcome":"win"},"14":{"points":2,"outcome":"win"}}}},{"nickname":"my dear","section":"active","rank":11,"reason":null,"archiveId":"-8500000000000011","snapshot":{"playedRounds":7,"wins":4,"draws":3,"losses":0,"adjustmentPoints":0,"activityPoints":1,"points":12,"winRate":0.7857142857,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":2,"outcome":"win"},"3":{"points":2,"outcome":"win"},"4":{"points":1,"outcome":"draw"},"5":{"points":1,"outcome":"draw"},"6":{"points":2,"outcome":"win"},"7":{"points":2,"outcome":"win"}}}},{"nickname":"0169","section":"active","rank":12,"reason":null,"archiveId":"-8500000000000012","snapshot":{"playedRounds":10,"wins":3,"draws":4,"losses":3,"adjustmentPoints":0,"activityPoints":2,"points":12,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":1,"outcome":"draw"},"3":{"points":0,"outcome":"loss"},"4":{"points":2,"outcome":"win"},"5":{"points":1,"outcome":"draw"},"6":{"points":0,"outcome":"loss"},"7":{"points":1,"outcome":"draw"},"8":{"points":2,"outcome":"win"},"9":{"points":0,"outcome":"loss"},"12":{"points":2,"outcome":"win"}}}},{"nickname":"wentyy","section":"active","rank":13,"reason":null,"archiveId":"-8500000000000013","snapshot":{"playedRounds":8,"wins":4,"draws":1,"losses":3,"adjustmentPoints":0,"activityPoints":2,"points":11,"winRate":0.5625,"supportsActivityPoints":true,"rounds":{"7":{"points":2,"outcome":"win"},"8":{"points":0,"outcome":"loss"},"9":{"points":2,"outcome":"win"},"10":{"points":2,"outcome":"win"},"11":{"points":2,"outcome":"win"},"12":{"points":0,"outcome":"loss"},"13":{"points":1,"outcome":"draw"},"14":{"points":0,"outcome":"loss"}}}},{"nickname":"deikku","section":"active","rank":14,"reason":null,"archiveId":"-8500000000000014","snapshot":{"playedRounds":8,"wins":2,"draws":4,"losses":2,"adjustmentPoints":0,"activityPoints":2,"points":10,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"2":{"points":1,"outcome":"draw"},"3":{"points":0,"outcome":"loss"},"4":{"points":1,"outcome":"draw"},"5":{"points":1,"outcome":"draw"},"6":{"points":2,"outcome":"win"},"7":{"points":1,"outcome":"draw"},"8":{"points":2,"outcome":"win"},"10":{"points":0,"outcome":"loss"}}}},{"nickname":"Euphoria","section":"active","rank":15,"reason":null,"archiveId":"-8500000000000015","snapshot":{"playedRounds":6,"wins":3,"draws":2,"losses":1,"adjustmentPoints":0,"activityPoints":1,"points":9,"winRate":0.6666666667,"supportsActivityPoints":true,"rounds":{"3":{"points":0,"outcome":"loss"},"5":{"points":1,"outcome":"draw"},"7":{"points":1,"outcome":"draw"},"9":{"points":2,"outcome":"win"},"10":{"points":2,"outcome":"win"},"11":{"points":2,"outcome":"win"}}}},{"nickname":"Helqnux","section":"active","rank":16,"reason":null,"archiveId":"-8500000000000016","snapshot":{"playedRounds":10,"wins":1,"draws":5,"losses":4,"adjustmentPoints":0,"activityPoints":2,"points":9,"winRate":0.35,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"3":{"points":0,"outcome":"loss"},"4":{"points":1,"outcome":"draw"},"5":{"points":1,"outcome":"draw"},"6":{"points":1,"outcome":"draw"},"7":{"points":0,"outcome":"loss"},"8":{"points":0,"outcome":"loss"},"11":{"points":2,"outcome":"win"},"12":{"points":0,"outcome":"loss"},"13":{"points":1,"outcome":"draw"}}}},{"nickname":"n3v3rno","section":"active","rank":17,"reason":null,"archiveId":"-8500000000000017","snapshot":{"playedRounds":8,"wins":1,"draws":5,"losses":2,"adjustmentPoints":0,"activityPoints":2,"points":9,"winRate":0.4375,"supportsActivityPoints":true,"rounds":{"2":{"points":0,"outcome":"loss"},"3":{"points":2,"outcome":"win"},"9":{"points":1,"outcome":"draw"},"10":{"points":0,"outcome":"loss"},"11":{"points":1,"outcome":"draw"},"12":{"points":1,"outcome":"draw"},"13":{"points":1,"outcome":"draw"},"14":{"points":1,"outcome":"draw"}}}},{"nickname":"TeMan","section":"active","rank":18,"reason":null,"archiveId":"-8500000000000018","snapshot":{"playedRounds":8,"wins":1,"draws":5,"losses":2,"adjustmentPoints":0,"activityPoints":2,"points":9,"winRate":0.4375,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":0,"outcome":"loss"},"3":{"points":1,"outcome":"draw"},"4":{"points":2,"outcome":"win"},"5":{"points":1,"outcome":"draw"},"6":{"points":1,"outcome":"draw"},"12":{"points":0,"outcome":"loss"},"14":{"points":1,"outcome":"draw"}}}},{"nickname":"SIXSEVENONE","section":"active","rank":19,"reason":null,"archiveId":"-8500000000000019","snapshot":{"playedRounds":8,"wins":1,"draws":4,"losses":3,"adjustmentPoints":0,"activityPoints":2,"points":8,"winRate":0.375,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":0,"outcome":"loss"},"3":{"points":2,"outcome":"win"},"4":{"points":1,"outcome":"draw"},"5":{"points":1,"outcome":"draw"},"6":{"points":1,"outcome":"draw"},"12":{"points":0,"outcome":"loss"},"14":{"points":0,"outcome":"loss"}}}},{"nickname":"SQWIZI","section":"active","rank":20,"reason":null,"archiveId":"-8500000000000020","snapshot":{"playedRounds":5,"wins":3,"draws":0,"losses":2,"adjustmentPoints":0,"activityPoints":1,"points":7,"winRate":0.6,"supportsActivityPoints":true,"rounds":{"7":{"points":2,"outcome":"win"},"8":{"points":2,"outcome":"win"},"9":{"points":0,"outcome":"loss"},"10":{"points":0,"outcome":"loss"},"11":{"points":2,"outcome":"win"}}}},{"nickname":"Meow","section":"active","rank":21,"reason":null,"archiveId":"-8500000000000021","snapshot":{"playedRounds":5,"wins":2,"draws":2,"losses":1,"adjustmentPoints":0,"activityPoints":1,"points":7,"winRate":0.6,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":2,"outcome":"win"},"3":{"points":2,"outcome":"win"},"4":{"points":0,"outcome":"loss"},"14":{"points":1,"outcome":"draw"}}}},{"nickname":"mudachyo","section":"active","rank":22,"reason":null,"archiveId":"-8500000000000022","snapshot":{"playedRounds":9,"wins":1,"draws":3,"losses":5,"adjustmentPoints":0,"activityPoints":2,"points":7,"winRate":0.2777777778,"supportsActivityPoints":true,"rounds":{"3":{"points":2,"outcome":"win"},"4":{"points":1,"outcome":"draw"},"5":{"points":1,"outcome":"draw"},"6":{"points":0,"outcome":"loss"},"7":{"points":1,"outcome":"draw"},"8":{"points":0,"outcome":"loss"},"11":{"points":0,"outcome":"loss"},"12":{"points":0,"outcome":"loss"},"14":{"points":0,"outcome":"loss"}}}},{"nickname":"Медузка","section":"active","rank":23,"reason":null,"archiveId":"-8500000000000023","snapshot":{"playedRounds":6,"wins":2,"draws":1,"losses":3,"adjustmentPoints":0,"activityPoints":1,"points":6,"winRate":0.4166666667,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":0,"outcome":"loss"},"3":{"points":2,"outcome":"win"},"4":{"points":0,"outcome":"loss"},"6":{"points":0,"outcome":"loss"},"8":{"points":2,"outcome":"win"}}}},{"nickname":"Игрок","section":"active","rank":24,"reason":null,"archiveId":"-8500000000000024","snapshot":{"playedRounds":7,"wins":0,"draws":4,"losses":3,"adjustmentPoints":1,"activityPoints":1,"points":6,"winRate":0.2857142857,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":1,"outcome":"draw"},"3":{"points":0,"outcome":"loss"},"7":{"points":0,"outcome":"loss"},"9":{"points":1,"outcome":"draw"},"10":{"points":0,"outcome":"loss"},"13":{"points":1,"outcome":"draw"}}}},{"nickname":"Wuqing","section":"active","rank":25,"reason":null,"archiveId":"-8500000000000025","snapshot":{"playedRounds":6,"wins":0,"draws":4,"losses":2,"adjustmentPoints":0,"activityPoints":1,"points":5,"winRate":0.3333333333,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":0,"outcome":"loss"},"3":{"points":1,"outcome":"draw"},"4":{"points":1,"outcome":"draw"},"8":{"points":1,"outcome":"draw"},"12":{"points":0,"outcome":"loss"}}}},{"nickname":"gtfo","section":"active","rank":26,"reason":null,"archiveId":"-8500000000000026","snapshot":{"playedRounds":5,"wins":0,"draws":4,"losses":1,"adjustmentPoints":0,"activityPoints":1,"points":5,"winRate":0.4,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":1,"outcome":"draw"},"9":{"points":1,"outcome":"draw"},"10":{"points":0,"outcome":"loss"},"11":{"points":1,"outcome":"draw"}}}},{"nickname":"Quentin Tarantino","section":"active","rank":27,"reason":null,"archiveId":"-8500000000000027","snapshot":{"playedRounds":4,"wins":0,"draws":4,"losses":0,"adjustmentPoints":0,"activityPoints":1,"points":5,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"9":{"points":1,"outcome":"draw"},"11":{"points":1,"outcome":"draw"},"12":{"points":1,"outcome":"draw"},"13":{"points":1,"outcome":"draw"}}}},{"nickname":"Reflection","section":"active","rank":28,"reason":null,"archiveId":"-8500000000000028","snapshot":{"playedRounds":4,"wins":0,"draws":4,"losses":0,"adjustmentPoints":0,"activityPoints":1,"points":5,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":1,"outcome":"draw"},"3":{"points":1,"outcome":"draw"},"4":{"points":1,"outcome":"draw"}}}},{"nickname":"the porridgy","section":"active","rank":29,"reason":null,"archiveId":"-8500000000000029","snapshot":{"playedRounds":2,"wins":2,"draws":0,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":4,"winRate":1,"supportsActivityPoints":true,"rounds":{"12":{"points":2,"outcome":"win"},"14":{"points":2,"outcome":"win"}}}},{"nickname":"shusha","section":"active","rank":30,"reason":null,"archiveId":"-8500000000000030","snapshot":{"playedRounds":3,"wins":1,"draws":2,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":4,"winRate":0.6666666667,"supportsActivityPoints":true,"rounds":{"3":{"points":2,"outcome":"win"},"4":{"points":1,"outcome":"draw"},"13":{"points":1,"outcome":"draw"}}}},{"nickname":"teron","section":"active","rank":31,"reason":null,"archiveId":"-8500000000000031","snapshot":{"playedRounds":3,"wins":1,"draws":2,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":4,"winRate":0.6666666667,"supportsActivityPoints":true,"rounds":{"9":{"points":1,"outcome":"draw"},"10":{"points":2,"outcome":"win"},"11":{"points":1,"outcome":"draw"}}}},{"nickname":"kuindzhi","section":"active","rank":32,"reason":null,"archiveId":"-8500000000000032","snapshot":{"playedRounds":5,"wins":0,"draws":3,"losses":2,"adjustmentPoints":0,"activityPoints":1,"points":4,"winRate":0.3,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":1,"outcome":"draw"},"8":{"points":0,"outcome":"loss"},"12":{"points":0,"outcome":"loss"},"13":{"points":1,"outcome":"draw"}}}},{"nickname":"pinksodreams","section":"active","rank":33,"reason":null,"archiveId":"-8500000000000033","snapshot":{"playedRounds":4,"wins":0,"draws":3,"losses":1,"adjustmentPoints":0,"activityPoints":1,"points":4,"winRate":0.375,"supportsActivityPoints":true,"rounds":{"5":{"points":1,"outcome":"draw"},"6":{"points":0,"outcome":"loss"},"7":{"points":1,"outcome":"draw"},"12":{"points":1,"outcome":"draw"}}}},{"nickname":"Ramp","section":"active","rank":34,"reason":null,"archiveId":"-8500000000000034","snapshot":{"playedRounds":4,"wins":0,"draws":3,"losses":1,"adjustmentPoints":0,"activityPoints":1,"points":4,"winRate":0.375,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":1,"outcome":"draw"},"4":{"points":0,"outcome":"loss"},"6":{"points":1,"outcome":"draw"}}}},{"nickname":"CordeLine","section":"active","rank":35,"reason":null,"archiveId":"-8500000000000035","snapshot":{"playedRounds":4,"wins":1,"draws":0,"losses":3,"adjustmentPoints":0,"activityPoints":1,"points":3,"winRate":0.25,"supportsActivityPoints":true,"rounds":{"2":{"points":2,"outcome":"win"},"3":{"points":0,"outcome":"loss"},"4":{"points":0,"outcome":"loss"},"8":{"points":0,"outcome":"loss"}}}},{"nickname":"ЖОПОНЮХ","section":"active","rank":36,"reason":null,"archiveId":"-8500000000000036","snapshot":{"playedRounds":2,"wins":1,"draws":1,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":3,"winRate":0.75,"supportsActivityPoints":true,"rounds":{"6":{"points":2,"outcome":"win"},"7":{"points":1,"outcome":"draw"}}}},{"nickname":"Caesar","section":"active","rank":37,"reason":null,"archiveId":"-8500000000000037","snapshot":{"playedRounds":2,"wins":1,"draws":1,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":3,"winRate":0.75,"supportsActivityPoints":true,"rounds":{"12":{"points":2,"outcome":"win"},"13":{"points":1,"outcome":"draw"}}}},{"nickname":"yo1o","section":"active","rank":38,"reason":null,"archiveId":"-8500000000000038","snapshot":{"playedRounds":2,"wins":1,"draws":1,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":3,"winRate":0.75,"supportsActivityPoints":true,"rounds":{"3":{"points":2,"outcome":"win"},"4":{"points":1,"outcome":"draw"}}}},{"nickname":"Noro","section":"active","rank":39,"reason":null,"archiveId":"-8500000000000039","snapshot":{"playedRounds":2,"wins":1,"draws":0,"losses":1,"adjustmentPoints":1,"activityPoints":0,"points":3,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"6":{"points":0,"outcome":"loss"},"8":{"points":2,"outcome":"win"}}}},{"nickname":"AZA","section":"active","rank":40,"reason":null,"archiveId":"-8500000000000040","snapshot":{"playedRounds":1,"wins":1,"draws":0,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":2,"winRate":1,"supportsActivityPoints":true,"rounds":{"8":{"points":2,"outcome":"win"}}}},{"nickname":"KON","section":"active","rank":41,"reason":null,"archiveId":"-8500000000000041","snapshot":{"playedRounds":1,"wins":1,"draws":0,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":2,"winRate":1,"supportsActivityPoints":true,"rounds":{"3":{"points":2,"outcome":"win"}}}},{"nickname":"saika","section":"active","rank":42,"reason":null,"archiveId":"-8500000000000042","snapshot":{"playedRounds":1,"wins":1,"draws":0,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":2,"winRate":1,"supportsActivityPoints":true,"rounds":{"6":{"points":2,"outcome":"win"}}}},{"nickname":"TX","section":"active","rank":43,"reason":null,"archiveId":"-8500000000000043","snapshot":{"playedRounds":1,"wins":1,"draws":0,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":2,"winRate":1,"supportsActivityPoints":true,"rounds":{"14":{"points":2,"outcome":"win"}}}},{"nickname":"franzj","section":"active","rank":44,"reason":null,"archiveId":"-8500000000000044","snapshot":{"playedRounds":3,"wins":0,"draws":2,"losses":1,"adjustmentPoints":0,"activityPoints":0,"points":2,"winRate":0.3333333333,"supportsActivityPoints":true,"rounds":{"7":{"points":1,"outcome":"draw"},"8":{"points":0,"outcome":"loss"},"12":{"points":1,"outcome":"draw"}}}},{"nickname":"H1DeX","section":"active","rank":45,"reason":null,"archiveId":"-8500000000000045","snapshot":{"playedRounds":2,"wins":0,"draws":2,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":2,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"5":{"points":1,"outcome":"draw"},"13":{"points":1,"outcome":"draw"}}}},{"nickname":"Sh1Ft","section":"active","rank":46,"reason":null,"archiveId":"-8500000000000046","snapshot":{"playedRounds":2,"wins":0,"draws":2,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":2,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"12":{"points":1,"outcome":"draw"}}}},{"nickname":"боку но пико","section":"active","rank":47,"reason":null,"archiveId":"-8500000000000047","snapshot":{"playedRounds":2,"wins":0,"draws":2,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":2,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"13":{"points":1,"outcome":"draw"},"14":{"points":1,"outcome":"draw"}}}},{"nickname":"mean","section":"active","rank":48,"reason":null,"archiveId":"-8500000000000048","snapshot":{"playedRounds":2,"wins":0,"draws":2,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":2,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"13":{"points":1,"outcome":"draw"},"14":{"points":1,"outcome":"draw"}}}},{"nickname":"z3r0n","section":"active","rank":49,"reason":null,"archiveId":"-8500000000000049","snapshot":{"playedRounds":3,"wins":0,"draws":1,"losses":2,"adjustmentPoints":0,"activityPoints":0,"points":1,"winRate":0.1666666667,"supportsActivityPoints":true,"rounds":{"3":{"points":0,"outcome":"loss"},"4":{"points":0,"outcome":"loss"},"11":{"points":1,"outcome":"draw"}}}},{"nickname":"denya","section":"active","rank":50,"reason":null,"archiveId":"-8500000000000050","snapshot":{"playedRounds":2,"wins":0,"draws":1,"losses":1,"adjustmentPoints":0,"activityPoints":0,"points":1,"winRate":0.25,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":0,"outcome":"loss"}}}},{"nickname":"ebanat","section":"active","rank":51,"reason":null,"archiveId":"-8500000000000051","snapshot":{"playedRounds":2,"wins":0,"draws":1,"losses":1,"adjustmentPoints":0,"activityPoints":0,"points":1,"winRate":0.25,"supportsActivityPoints":true,"rounds":{"3":{"points":0,"outcome":"loss"},"4":{"points":1,"outcome":"draw"}}}},{"nickname":"nice","section":"active","rank":52,"reason":null,"archiveId":"-8500000000000052","snapshot":{"playedRounds":2,"wins":0,"draws":1,"losses":1,"adjustmentPoints":0,"activityPoints":0,"points":1,"winRate":0.25,"supportsActivityPoints":true,"rounds":{"2":{"points":0,"outcome":"loss"},"8":{"points":1,"outcome":"draw"}}}},{"nickname":"Silvan","section":"active","rank":53,"reason":null,"archiveId":"-8500000000000053","snapshot":{"playedRounds":2,"wins":0,"draws":1,"losses":1,"adjustmentPoints":0,"activityPoints":0,"points":1,"winRate":0.25,"supportsActivityPoints":true,"rounds":{"3":{"points":1,"outcome":"draw"},"4":{"points":0,"outcome":"loss"}}}},{"nickname":"КАСАТКА","section":"active","rank":54,"reason":null,"archiveId":"-8500000000000054","snapshot":{"playedRounds":1,"wins":0,"draws":1,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":1,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"13":{"points":1,"outcome":"draw"}}}},{"nickname":"попущенный","section":"active","rank":55,"reason":null,"archiveId":"-8500000000000055","snapshot":{"playedRounds":1,"wins":0,"draws":1,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":1,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"4":{"points":1,"outcome":"draw"}}}},{"nickname":"Boofa","section":"active","rank":56,"reason":null,"archiveId":"-8500000000000056","snapshot":{"playedRounds":1,"wins":0,"draws":1,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":1,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"}}}},{"nickname":"D4ik","section":"active","rank":57,"reason":null,"archiveId":"-8500000000000057","snapshot":{"playedRounds":1,"wins":0,"draws":1,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":1,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"4":{"points":1,"outcome":"draw"}}}},{"nickname":"Metisa","section":"active","rank":58,"reason":null,"archiveId":"-8500000000000058","snapshot":{"playedRounds":1,"wins":0,"draws":1,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":1,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"4":{"points":1,"outcome":"draw"}}}},{"nickname":"Pt14ka","section":"active","rank":59,"reason":null,"archiveId":"-8500000000000059","snapshot":{"playedRounds":1,"wins":0,"draws":1,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":1,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"5":{"points":1,"outcome":"draw"}}}},{"nickname":"Ovip Lokos","section":"active","rank":60,"reason":null,"archiveId":"-8500000000000060","snapshot":{"playedRounds":1,"wins":0,"draws":1,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":1,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"14":{"points":1,"outcome":"draw"}}}},{"nickname":"otbitii pank","section":"active","rank":61,"reason":null,"archiveId":"-8500000000000061","snapshot":{"playedRounds":1,"wins":0,"draws":1,"losses":0,"adjustmentPoints":0,"activityPoints":0,"points":1,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"14":{"points":1,"outcome":"draw"}}}},{"nickname":"9й Неизвестный","section":"active","rank":62,"reason":null,"archiveId":"-8500000000000062","snapshot":{"playedRounds":1,"wins":0,"draws":0,"losses":1,"adjustmentPoints":0,"activityPoints":0,"points":0,"winRate":0,"supportsActivityPoints":true,"rounds":{"3":{"points":0,"outcome":"loss"}}}},{"nickname":"balbes","section":"active","rank":63,"reason":null,"archiveId":"-8500000000000063","snapshot":{"playedRounds":1,"wins":0,"draws":0,"losses":1,"adjustmentPoints":0,"activityPoints":0,"points":0,"winRate":0,"supportsActivityPoints":true,"rounds":{"12":{"points":0,"outcome":"loss"}}}},{"nickname":"Ethnic","section":"active","rank":64,"reason":null,"archiveId":"-8500000000000064","snapshot":{"playedRounds":1,"wins":0,"draws":0,"losses":1,"adjustmentPoints":0,"activityPoints":0,"points":0,"winRate":0,"supportsActivityPoints":true,"rounds":{"2":{"points":0,"outcome":"loss"}}}},{"nickname":"SCP-1504","section":"active","rank":65,"reason":null,"archiveId":"-8500000000000065","snapshot":{"playedRounds":1,"wins":0,"draws":0,"losses":1,"adjustmentPoints":0,"activityPoints":0,"points":0,"winRate":0,"supportsActivityPoints":true,"rounds":{"3":{"points":0,"outcome":"loss"}}}},{"nickname":"Yoichi","section":"active","rank":66,"reason":null,"archiveId":"-8500000000000066","snapshot":{"playedRounds":1,"wins":0,"draws":0,"losses":1,"adjustmentPoints":0,"activityPoints":0,"points":0,"winRate":0,"supportsActivityPoints":true,"rounds":{"3":{"points":0,"outcome":"loss"}}}},{"nickname":"Uclonist","section":"inactive","rank":1,"reason":null,"archiveId":"-8500000000000067","snapshot":{"playedRounds":12,"wins":4,"draws":4,"losses":4,"adjustmentPoints":0,"activityPoints":4,"points":16,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":1,"outcome":"draw"},"3":{"points":2,"outcome":"win"},"4":{"points":2,"outcome":"win"},"5":{"points":1,"outcome":"draw"},"6":{"points":0,"outcome":"loss"},"7":{"points":2,"outcome":"win"},"8":{"points":0,"outcome":"loss"},"10":{"points":0,"outcome":"loss"},"11":{"points":0,"outcome":"loss"},"12":{"points":2,"outcome":"win"},"13":{"points":1,"outcome":"draw"}}}},{"nickname":"FouR","section":"inactive","rank":2,"reason":null,"archiveId":"-8500000000000068","snapshot":{"playedRounds":9,"wins":3,"draws":6,"losses":0,"adjustmentPoints":0,"activityPoints":2,"points":14,"winRate":0.6666666667,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":2,"outcome":"win"},"3":{"points":1,"outcome":"draw"},"4":{"points":1,"outcome":"draw"},"5":{"points":1,"outcome":"draw"},"6":{"points":2,"outcome":"win"},"7":{"points":1,"outcome":"draw"},"8":{"points":1,"outcome":"draw"},"9":{"points":2,"outcome":"win"}}}},{"nickname":"Диваныч","section":"inactive","rank":3,"reason":null,"archiveId":"-8500000000000069","snapshot":{"playedRounds":9,"wins":1,"draws":7,"losses":1,"adjustmentPoints":0,"activityPoints":2,"points":11,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":1,"outcome":"draw"},"3":{"points":1,"outcome":"draw"},"4":{"points":1,"outcome":"draw"},"5":{"points":1,"outcome":"draw"},"6":{"points":2,"outcome":"win"},"8":{"points":1,"outcome":"draw"},"9":{"points":1,"outcome":"draw"},"10":{"points":0,"outcome":"loss"}}}},{"nickname":"Korol","section":"inactive","rank":4,"reason":null,"archiveId":"-8500000000000070","snapshot":{"playedRounds":9,"wins":2,"draws":4,"losses":3,"adjustmentPoints":0,"activityPoints":2,"points":10,"winRate":0.4444444444,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"2":{"points":0,"outcome":"loss"},"3":{"points":0,"outcome":"loss"},"4":{"points":1,"outcome":"draw"},"5":{"points":1,"outcome":"draw"},"6":{"points":2,"outcome":"win"},"7":{"points":0,"outcome":"loss"},"8":{"points":1,"outcome":"draw"},"10":{"points":2,"outcome":"win"}}}},{"nickname":"Kepleomax","section":"inactive","rank":5,"reason":null,"archiveId":"-8500000000000071","snapshot":{"playedRounds":8,"wins":2,"draws":3,"losses":2,"adjustmentPoints":0,"activityPoints":2,"points":9,"winRate":0.4375,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"3":{"points":2,"outcome":"win"},"4":{"points":0,"outcome":"loss"},"5":{"points":1,"outcome":"draw"},"6":{"points":1,"outcome":"draw"},"7":{"points":0,"outcome":"loss"},"8":{"points":2,"outcome":"win"}}}},{"nickname":"Fuksik","section":"inactive","rank":6,"reason":null,"archiveId":"-8500000000000072","snapshot":{"playedRounds":9,"wins":1,"draws":5,"losses":3,"adjustmentPoints":0,"activityPoints":2,"points":9,"winRate":0.3888888889,"supportsActivityPoints":true,"rounds":{"1":{"points":1,"outcome":"draw"},"3":{"points":1,"outcome":"draw"},"4":{"points":2,"outcome":"win"},"5":{"points":1,"outcome":"draw"},"6":{"points":1,"outcome":"draw"},"7":{"points":0,"outcome":"loss"},"8":{"points":1,"outcome":"draw"},"9":{"points":0,"outcome":"loss"},"10":{"points":0,"outcome":"loss"}}}},{"nickname":"Alkatraz","section":"inactive","rank":7,"reason":null,"archiveId":"-8500000000000073","snapshot":{"playedRounds":4,"wins":1,"draws":3,"losses":0,"adjustmentPoints":0,"activityPoints":1,"points":6,"winRate":0.625,"supportsActivityPoints":true,"rounds":{"4":{"points":2,"outcome":"win"},"5":{"points":1,"outcome":"draw"},"6":{"points":1,"outcome":"draw"},"8":{"points":1,"outcome":"draw"}}}},{"nickname":"Glamdring","section":"inactive","rank":8,"reason":null,"archiveId":"-8500000000000074","snapshot":{"playedRounds":4,"wins":0,"draws":3,"losses":1,"adjustmentPoints":0,"activityPoints":1,"points":4,"winRate":0.375,"supportsActivityPoints":true,"rounds":{"4":{"points":1,"outcome":"draw"},"5":{"points":1,"outcome":"draw"},"6":{"points":0,"outcome":"loss"},"7":{"points":1,"outcome":"draw"}}}},{"nickname":"Sakana","section":"inactive","rank":9,"reason":null,"archiveId":"-8500000000000075","snapshot":{"playedRounds":4,"wins":1,"draws":2,"losses":1,"adjustmentPoints":0,"activityPoints":1,"points":5,"winRate":0.5,"supportsActivityPoints":true,"rounds":{"4":{"points":0,"outcome":"loss"},"5":{"points":1,"outcome":"draw"},"6":{"points":2,"outcome":"win"},"7":{"points":1,"outcome":"draw"}}}},{"nickname":"mydachyo","section":"inactive","rank":10,"reason":"Указан в составе верхнего финала, но отсутствует в итоговой таблице Excel","archiveId":"-8500000000000076","snapshot":null}]
$season3_players$::jsonb) AS source(
        nickname TEXT,
        section TEXT,
        rank INT,
        reason TEXT,
        "archiveId" TEXT,
        snapshot JSONB
    );

    SELECT STRING_AGG(source.nickname, ', ' ORDER BY source.nickname)
    INTO duplicate_active_names
    FROM season3_player_source source
    WHERE (
        SELECT COUNT(*)
        FROM players player
        WHERE player.is_archived = FALSE
          AND LOWER(BTRIM(player.ingame_name)) = LOWER(BTRIM(source.nickname))
    ) > 1;

    IF duplicate_active_names IS NOT NULL THEN
        RAISE EXCEPTION
            'Найдено несколько активных профилей с никами Season 3: %',
            duplicate_active_names;
    END IF;

    INSERT INTO players (
        discord_id,
        steam_id32,
        ingame_name,
        real_name,
        is_archived
    )
    SELECT
        source."archiveId"::BIGINT,
        source."archiveId"::BIGINT,
        source.nickname,
        'Архивная запись Season 3 — профиль не привязан',
        TRUE
    FROM season3_player_source source
    WHERE NOT EXISTS (
        SELECT 1
        FROM players active_player
        WHERE active_player.is_archived = FALSE
          AND LOWER(BTRIM(active_player.ingame_name)) =
              LOWER(BTRIM(source.nickname))
    )
    ON CONFLICT (discord_id) DO NOTHING;

    CREATE TEMP TABLE season3_player_map ON COMMIT DROP AS
    SELECT
        source.*,
        COALESCE(active_player.discord_id, source."archiveId"::BIGINT)
            AS player_id
    FROM season3_player_source source
    LEFT JOIN LATERAL (
        SELECT player.discord_id
        FROM players player
        WHERE player.is_archived = FALSE
          AND LOWER(BTRIM(player.ingame_name)) = LOWER(BTRIM(source.nickname))
        LIMIT 1
    ) active_player ON TRUE;

    INSERT INTO tournaments (
        slug,
        name,
        eyebrow,
        headline,
        headline_accent,
        description,
        about,
        start_at,
        end_at,
        registration_deadline,
        status_label,
        format,
        team_size,
        max_teams,
        region,
        server,
        check_in_minutes,
        group_format,
        playoff_format,
        final_format,
        discord_url,
        status,
        tournament_type,
        season_round_count,
        season_activity_points_note
    ) VALUES (
        'league-season-3',
        'Linken''s Sphere eSports 5x5 League Season 3',
        'Архивный сезонный турнир',
        'Linken''s Sphere eSports 5x5 League',
        'Season 3',
        'Четырнадцать туров индивидуальной лиги осенью 2023 года и два финальных матча.',
        'Итоги перенесены из Excel-таблицы Season 3. Составы регулярных матчей не сохранились, поэтому индивидуальные результаты 2:0, 1:1 и 0:2 показаны непосредственно в таблице сезона. Серые и пустые ячейки означают пропуск или отсутствие сохранённого результата.',
        '2023-09-03T20:00:00+03:00',
        '2023-12-01T23:59:00+03:00',
        '2023-09-02T20:00:00+03:00',
        'Турнир завершён',
        'Сезонная лига · 5 × 5 · BO2',
        5,
        76,
        'EU / RU',
        'EU West',
        60,
        '14 туров · результаты по итоговой таблице',
        '',
        '2 финала · верхний и нижний',
        'https://discord.gg/lsesports',
        'archived',
        'seasonal',
        14,
        'За каждые 4 сыгранных матча начислялось +1 РО. При 12 сыгранных матчах — не более двух пропусков за сезон — начислялось ещё +1 РО.'
    )
    ON CONFLICT (slug) DO UPDATE SET
        season_activity_points_note =
            EXCLUDED.season_activity_points_note,
        updated_at = NOW();

    CREATE TEMP TABLE season3_round_source ON COMMIT DROP AS
    SELECT *
    FROM jsonb_to_recordset($season3_rounds$
[{"roundNumber":1,"name":"Тур 1","kind":"regular","scheduledAt":"2023-09-03T20:00:00+03:00"},{"roundNumber":2,"name":"Тур 2","kind":"regular","scheduledAt":"2023-09-08T20:00:00+03:00"},{"roundNumber":3,"name":"Тур 3","kind":"regular","scheduledAt":"2023-09-17T20:00:00+03:00"},{"roundNumber":4,"name":"Тур 4","kind":"regular","scheduledAt":"2023-09-22T20:00:00+03:00"},{"roundNumber":5,"name":"Тур 5","kind":"regular","scheduledAt":"2023-10-01T20:00:00+03:00"},{"roundNumber":6,"name":"Тур 6","kind":"regular","scheduledAt":"2023-10-06T20:00:00+03:00"},{"roundNumber":7,"name":"Тур 7","kind":"regular","scheduledAt":"2023-10-15T20:00:00+03:00"},{"roundNumber":8,"name":"Тур 8","kind":"regular","scheduledAt":"2023-10-20T20:00:00+03:00"},{"roundNumber":9,"name":"Тур 9","kind":"regular","scheduledAt":"2023-11-03T20:00:00+03:00"},{"roundNumber":10,"name":"Тур 10","kind":"regular","scheduledAt":"2023-11-12T20:00:00+03:00"},{"roundNumber":11,"name":"Тур 11","kind":"regular","scheduledAt":"2023-11-17T20:00:00+03:00"},{"roundNumber":12,"name":"Тур 12","kind":"regular","scheduledAt":"2023-11-24T20:00:00+03:00"},{"roundNumber":13,"name":"Тур 13","kind":"regular","scheduledAt":"2023-11-26T20:00:00+03:00"},{"roundNumber":14,"name":"Тур 14","kind":"regular","scheduledAt":"2023-12-01T20:00:00+03:00"},{"roundNumber":15,"name":"Финалы","kind":"finals","scheduledAt":null}]
$season3_rounds$::jsonb) AS source(
        "roundNumber" INT,
        name TEXT,
        kind TEXT,
        "scheduledAt" TIMESTAMPTZ
    );

    INSERT INTO season_rounds (
        tournament_id,
        round_number,
        name,
        status,
        scheduled_at,
        is_visible,
        round_kind
    )
    SELECT
        tournament.id,
        source."roundNumber",
        source.name,
        'completed',
        source."scheduledAt",
        TRUE,
        source.kind
    FROM season3_round_source source
    JOIN tournaments tournament ON tournament.slug = 'league-season-3'
    ON CONFLICT (tournament_id, round_number) DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        scheduled_at = EXCLUDED.scheduled_at,
        is_visible = EXCLUDED.is_visible,
        round_kind = EXCLUDED.round_kind,
        updated_at = NOW();

    INSERT INTO season_participants (
        tournament_id,
        player_id,
        nickname_snapshot,
        standings_section,
        inactive_reason,
        rank_snapshot,
        standings_snapshot
    )
    SELECT
        tournament.id,
        player_map.player_id,
        player_map.nickname,
        player_map.section,
        player_map.reason,
        player_map.rank,
        player_map.snapshot
    FROM season3_player_map player_map
    JOIN tournaments tournament ON tournament.slug = 'league-season-3'
    ON CONFLICT (tournament_id, player_id) DO UPDATE SET
        nickname_snapshot = EXCLUDED.nickname_snapshot,
        standings_section = EXCLUDED.standings_section,
        inactive_reason = EXCLUDED.inactive_reason,
        rank_snapshot = EXCLUDED.rank_snapshot,
        standings_snapshot = EXCLUDED.standings_snapshot;

    CREATE TEMP TABLE season3_adjustment_source ON COMMIT DROP AS
    SELECT *
    FROM jsonb_to_recordset($season3_adjustments$
[{"nickname":"Besst","amount":4,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Bel1eve","amount":4,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"frokeng","amount":4,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"nikdorbaz","amount":4,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"whiteriver","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Decadence","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Bot Fergus","amount":4,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Immersion","amount":4,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Mapes","amount":4,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Пушинка","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"my dear","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"0169","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"wentyy","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"deikku","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Euphoria","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Helqnux","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"n3v3rno","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"TeMan","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"SIXSEVENONE","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"SQWIZI","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Meow","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"mudachyo","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Медузка","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Игрок","amount":1,"kind":"manual","reason":"Поправка p из итоговой таблицы Excel: штраф или небазовый бонус активности; точная причина не указана"},{"nickname":"Игрок","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Wuqing","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"gtfo","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Quentin Tarantino","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Reflection","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"kuindzhi","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"pinksodreams","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Ramp","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"CordeLine","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Noro","amount":1,"kind":"manual","reason":"Поправка p из итоговой таблицы Excel: штраф или небазовый бонус активности; точная причина не указана"},{"nickname":"Uclonist","amount":4,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"FouR","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Диваныч","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Korol","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Kepleomax","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Fuksik","amount":2,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Alkatraz","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Glamdring","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"},{"nickname":"Sakana","amount":1,"kind":"activity","reason":"Базовые очки активности +ap: +1 за каждые 4 игры и ещё +1 при 12 играх"}]
$season3_adjustments$::jsonb) AS source(
        nickname TEXT,
        amount INT,
        kind TEXT,
        reason TEXT
    );

    INSERT INTO season_point_adjustments (
        tournament_id,
        player_id,
        amount,
        reason,
        adjustment_kind
    )
    SELECT
        tournament.id,
        player_map.player_id,
        source.amount,
        source.reason,
        source.kind
    FROM season3_adjustment_source source
    JOIN season3_player_map player_map
      ON LOWER(BTRIM(player_map.nickname)) = LOWER(BTRIM(source.nickname))
    JOIN tournaments tournament ON tournament.slug = 'league-season-3';

    CREATE TEMP TABLE season3_final_match_source ON COMMIT DROP AS
    SELECT *
    FROM jsonb_to_recordset($season3_final_matches$
[{"lobbyOrder":1,"title":"Верхний финал","teamAName":"Fergusity","teamBName":"Miners Dance","teamAScore":2,"teamBScore":0,"result":"team_a","teamA":[{"displayNickname":"Bot Fergus","sourceNickname":"Bot Fergus"},{"displayNickname":"Euphoria","sourceNickname":"Euphoria"},{"displayNickname":"Decadence","sourceNickname":"Decadence"},{"displayNickname":"mydachyo","sourceNickname":"mydachyo"},{"displayNickname":"whiteriver","sourceNickname":"whiteriver"}],"teamB":[{"displayNickname":"nikdorbaz","sourceNickname":"nikdorbaz"},{"displayNickname":"ПУШИНКА","sourceNickname":"Пушинка"},{"displayNickname":"SIXSEVENONE","sourceNickname":"SIXSEVENONE"},{"displayNickname":"wentyy","sourceNickname":"wentyy"},{"displayNickname":"Bel1eve","sourceNickname":"Bel1eve"}]},{"lobbyOrder":2,"title":"Нижний финал","teamAName":"Negri","teamBName":"Raby Nagieva","teamAScore":1,"teamBScore":2,"result":"team_b","teamA":[{"displayNickname":"Helqnux","sourceNickname":"Helqnux"},{"displayNickname":"pinksodreams","sourceNickname":"pinksodreams"},{"displayNickname":"Immersion","sourceNickname":"Immersion"},{"displayNickname":"n3v3rno","sourceNickname":"n3v3rno"},{"displayNickname":"Meow","sourceNickname":"Meow"}],"teamB":[{"displayNickname":"gtfo","sourceNickname":"gtfo"},{"displayNickname":"Mapes","sourceNickname":"Mapes"},{"displayNickname":"Besst","sourceNickname":"Besst"},{"displayNickname":"frokeng","sourceNickname":"frokeng"},{"displayNickname":"TERON","sourceNickname":"teron"}]}]
$season3_final_matches$::jsonb) AS source(
        "lobbyOrder" INT,
        title TEXT,
        "teamAName" TEXT,
        "teamBName" TEXT,
        "teamAScore" INT,
        "teamBScore" INT,
        result TEXT,
        "teamA" JSONB,
        "teamB" JSONB
    );

    INSERT INTO season_lobbies (
        round_id,
        name,
        sort_order,
        status,
        scheduled_at
    )
    SELECT
        round.id,
        source.title,
        source."lobbyOrder",
        'completed',
        round.scheduled_at
    FROM season3_final_match_source source
    JOIN tournaments tournament ON tournament.slug = 'league-season-3'
    JOIN season_rounds round
      ON round.tournament_id = tournament.id
     AND round.round_kind = 'finals'
    ON CONFLICT (round_id, sort_order) DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        scheduled_at = EXCLUDED.scheduled_at,
        updated_at = NOW();

    INSERT INTO season_matches (
        lobby_id,
        scheduled_at,
        team_a_name,
        team_b_name,
        best_of,
        team_a_score,
        team_b_score,
        result,
        status,
        sort_order
    )
    SELECT
        lobby.id,
        lobby.scheduled_at,
        source."teamAName",
        source."teamBName",
        3,
        source."teamAScore",
        source."teamBScore",
        source.result,
        'completed',
        1
    FROM season3_final_match_source source
    JOIN tournaments tournament ON tournament.slug = 'league-season-3'
    JOIN season_rounds round
      ON round.tournament_id = tournament.id
     AND round.round_kind = 'finals'
    JOIN season_lobbies lobby
      ON lobby.round_id = round.id
     AND lobby.sort_order = source."lobbyOrder"
    ON CONFLICT (lobby_id, sort_order) DO UPDATE SET
        team_a_name = EXCLUDED.team_a_name,
        team_b_name = EXCLUDED.team_b_name,
        best_of = EXCLUDED.best_of,
        team_a_score = EXCLUDED.team_a_score,
        team_b_score = EXCLUDED.team_b_score,
        result = EXCLUDED.result,
        status = EXCLUDED.status,
        updated_at = NOW();

    INSERT INTO season_match_participants (
        match_id,
        player_id,
        nickname_snapshot,
        team_side,
        is_captain,
        tier_snapshot
    )
    SELECT
        match.id,
        player_map.player_id,
        player_data.value->>'displayNickname',
        player_data.team_side,
        FALSE,
        NULL
    FROM season3_final_match_source source
    JOIN tournaments tournament ON tournament.slug = 'league-season-3'
    JOIN season_rounds round
      ON round.tournament_id = tournament.id
     AND round.round_kind = 'finals'
    JOIN season_lobbies lobby
      ON lobby.round_id = round.id
     AND lobby.sort_order = source."lobbyOrder"
    JOIN season_matches match
      ON match.lobby_id = lobby.id
     AND match.sort_order = 1
    CROSS JOIN LATERAL (
        SELECT value, 'a'::CHAR(1) AS team_side
        FROM jsonb_array_elements(source."teamA")
        UNION ALL
        SELECT value, 'b'::CHAR(1) AS team_side
        FROM jsonb_array_elements(source."teamB")
    ) player_data
    JOIN season3_player_map player_map
      ON LOWER(BTRIM(player_map.nickname)) =
          LOWER(BTRIM(player_data.value->>'sourceNickname'))
    ON CONFLICT (match_id, player_id) DO UPDATE SET
        nickname_snapshot = EXCLUDED.nickname_snapshot,
        team_side = EXCLUDED.team_side;

    CREATE TEMP TABLE season3_finalist_source ON COMMIT DROP AS
    SELECT *
    FROM jsonb_to_recordset($season3_finalists$
[{"displayNickname":"Bot Fergus","sourceNickname":"Bot Fergus","medal":"gold","seed":1},{"displayNickname":"Euphoria","sourceNickname":"Euphoria","medal":"gold","seed":2},{"displayNickname":"Decadence","sourceNickname":"Decadence","medal":"gold","seed":3},{"displayNickname":"mydachyo","sourceNickname":"mydachyo","medal":"gold","seed":4},{"displayNickname":"whiteriver","sourceNickname":"whiteriver","medal":"gold","seed":5},{"displayNickname":"nikdorbaz","sourceNickname":"nikdorbaz","medal":"silver","seed":6},{"displayNickname":"ПУШИНКА","sourceNickname":"Пушинка","medal":"silver","seed":7},{"displayNickname":"SIXSEVENONE","sourceNickname":"SIXSEVENONE","medal":"silver","seed":8},{"displayNickname":"wentyy","sourceNickname":"wentyy","medal":"silver","seed":9},{"displayNickname":"Bel1eve","sourceNickname":"Bel1eve","medal":"silver","seed":10},{"displayNickname":"gtfo","sourceNickname":"gtfo","medal":"gold","seed":11},{"displayNickname":"Mapes","sourceNickname":"Mapes","medal":"gold","seed":12},{"displayNickname":"Besst","sourceNickname":"Besst","medal":"gold","seed":13},{"displayNickname":"frokeng","sourceNickname":"frokeng","medal":"gold","seed":14},{"displayNickname":"TERON","sourceNickname":"teron","medal":"gold","seed":15},{"displayNickname":"Helqnux","sourceNickname":"Helqnux","medal":"silver","seed":16},{"displayNickname":"pinksodreams","sourceNickname":"pinksodreams","medal":"silver","seed":17},{"displayNickname":"Immersion","sourceNickname":"Immersion","medal":"silver","seed":18},{"displayNickname":"n3v3rno","sourceNickname":"n3v3rno","medal":"silver","seed":19},{"displayNickname":"Meow","sourceNickname":"Meow","medal":"silver","seed":20}]
$season3_finalists$::jsonb) AS source(
        "displayNickname" TEXT,
        "sourceNickname" TEXT,
        medal TEXT,
        seed INT
    );

    INSERT INTO season_finalists (
        tournament_id,
        player_id,
        seed,
        medal,
        note
    )
    SELECT
        tournament.id,
        player_map.player_id,
        source.seed,
        source.medal,
        'Медаль по указанному результату финала Season 3'
    FROM season3_finalist_source source
    JOIN season3_player_map player_map
      ON LOWER(BTRIM(player_map.nickname)) =
          LOWER(BTRIM(source."sourceNickname"))
    JOIN tournaments tournament ON tournament.slug = 'league-season-3'
    ON CONFLICT (tournament_id, player_id) DO UPDATE SET
        seed = EXCLUDED.seed,
        medal = EXCLUDED.medal,
        note = EXCLUDED.note,
        updated_at = NOW();

    INSERT INTO player_medals (
        player_id,
        tournament_id,
        medal_type,
        title,
        description,
        awarded_by
    )
    SELECT
        finalist.player_id,
        finalist.tournament_id,
        finalist.medal,
        tournament.name || CASE
            WHEN finalist.medal = 'gold' THEN ' — Победитель'
            ELSE ' — Финалист'
        END,
        'Награда восстановлена по указанным итогам финала Season 3',
        NULL
    FROM season_finalists finalist
    JOIN tournaments tournament ON tournament.id = finalist.tournament_id
    WHERE tournament.slug = 'league-season-3'
      AND finalist.medal IN ('gold', 'silver')
      AND NOT EXISTS (
          SELECT 1
          FROM player_medals existing
          WHERE existing.player_id = finalist.player_id
            AND existing.tournament_id = finalist.tournament_id
            AND existing.medal_type = finalist.medal
      );

    INSERT INTO tournament_rules (tournament_id, sort_order, rule_text)
    SELECT tournament.id, rule.sort_order, rule.rule_text
    FROM tournaments tournament
    CROSS JOIN (VALUES
        (1, 'Победа 2:0 приносила 2 РО, ничья 1:1 — 1 РО, поражение 0:2 — 0 РО.'),
        (2, '+ap: за каждые 4 сыгранных матча начислялось +1 РО; при 12 сыгранных матчах начислялось ещё +1 РО.'),
        (3, 'p: штрафы и небазовые бонусы, включая бонус за активность в последних трёх турах или помощь с доигровками.'),
        (4, 'Серые ячейки в исходной таблице означали пропуск матча; несохранённые составы регулярных лобби не восстанавливались предположениями.')
    ) rule(sort_order, rule_text)
    WHERE tournament.slug = 'league-season-3'
      AND NOT EXISTS (
          SELECT 1
          FROM tournament_rules existing
          WHERE existing.tournament_id = tournament.id
            AND existing.sort_order = rule.sort_order
      );

    INSERT INTO tournament_season_facts (
        tournament_id,
        sort_order,
        value_text,
        label
    )
    SELECT tournament.id, fact.sort_order, fact.value_text, fact.label
    FROM tournaments tournament
    CROSS JOIN (VALUES
        (1, '14', 'Всего туров в сезоне'),
        (2, '14', 'Результаты сохранены в Excel'),
        (3, '66', 'Игроков в итоговом зачёте'),
        (4, '2', 'Финальных матча')
    ) fact(sort_order, value_text, label)
    WHERE tournament.slug = 'league-season-3'
    ON CONFLICT (tournament_id, sort_order) DO UPDATE SET
        value_text = EXCLUDED.value_text,
        label = EXCLUDED.label;
END
$migration$;
