import { expect, it } from "vitest";
import { matchStageLabels, bracketFromStageDetail } from "./match-stage-labels";
it("replaces legacy repeated group text with exactly two lines and stable match numbers",()=>{
 const rows=[{id:1,stage:"Групповой этап · Группа А · Раунд 1",bracket_side:"group",bracket_round:1,bracket_slot:1},
 {id:2,stage:"Групповой этап · Группа А · Раунд 1",bracket_side:"group",bracket_round:1,bracket_slot:2}];
 expect(matchStageLabels(rows[0],rows)).toEqual({title:"Групповой этап",detail:"Матч 1"});
 expect(matchStageLabels(rows[1],rows)).toEqual({title:"Групповой этап",detail:"Матч 2"});
});
it.each([["upper",1,"Верхняя сетка · Раунд 1"],["lower",1,"Нижняя сетка · Раунд 1"],["lower",2,"Нижняя сетка · Раунд 2"],["grand_final",1,"Гранд-финал"]])("formats %s round %s",(side,round,detail)=>{
 expect(matchStageLabels({stage:"Старый дублирующий текст",bracket_side:String(side),bracket_round:Number(round)})).toEqual({title:"Play Off",detail});
});
it("preserves the two organizer labels and derives new bracket metadata",()=>{
 expect(matchStageLabels({stage:"Play Off",stage_detail:"Гранд-финал"})).toEqual({title:"Play Off",detail:"Гранд-финал"});
 expect(bracketFromStageDetail("Нижняя сетка · Раунд 2")).toEqual({bracketSide:"lower",bracketRound:2,bracketSlot:null});
});
