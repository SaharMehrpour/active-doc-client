/**
 * Created by saharmehrpour on 9/6/17.
 */

import React, {Component, Fragment} from "react";
import {connect} from "react-redux";
import "../App.css";
import {
    Tab, Tabs, Badge, FormGroup, ControlLabel, Label, Collapse
} from "react-bootstrap";
import {FaCaretDown,FaCaretUp} from "react-icons/fa";

import {ignoreFileChange} from "../actions";
import Utilities from "../core/utilities";
import {reduxStoreMessages} from "../reduxStoreConstants";
import {webSocketSendMessage} from "../core/coreConstants";
import {relatives} from "../core/ruleExecutorConstants";
import {hashConst, none_filePath} from "./uiConstants";


class RulePanel extends Component {

    constructor(props) {
        super(props);
        this.ruleIndex = props.ruleIndex !== undefined ? props.ruleIndex : -1;
        /**
         * @type {null|{index:number, title:string, description:string, tags:[], grammar:string, 
         * checkForFilesFolders:[string], checkForFilesFoldersConstraints:"INCLUDE"|"EXCLUDE"|"NONE", 
         * processFilesFolders:"WITHIN", 
         * quantifierXPathQuery:[], constraintXPathQuery:[], quantifierQueryType:string, constraintQueryType:string,
         * xPathQueryResult:[{
         * data:{quantifierResult:[{filePath:string,snippet:string,xml:{fileName:string,  
         * xml:string}}], 
         * satisfied:number, satisfiedResult:[], violated:number, violatedResult:[]
         * changed:boolean,violatedChanged:string,satisfiedChanged:string,allChanged:string}, 
         * filePath:string
         * }]}}
         */
        this.ruleI = null;
        this.newRuleRequest = this.ruleIndex === -1;

        this.state = {
            openPanel: true,
            className: "rulePanelDiv" + (this.newRuleRequest ? " edit-bg" : ""),
            activeTab: 0,

            title: "",
            description: "",
            ruleTags: [],
            folderConstraint: "",
            filesFolders: [],
            tags: [],

            filePath: none_filePath
        };

        // existing rule
        if (!this.newRuleRequest && this.ruleIndex !== -1) {
            let indices = props.rules.map(d => d.index);
            let arrayIndex = indices.indexOf(this.ruleIndex);
            if (arrayIndex === -1)
                console.log(`error: rule with index ${this.ruleIndex} is not found in the ruleTable.
                Only ${indices.toString()} are found as indices.`);
            else {
                this.ruleI = props.rules[arrayIndex];
                this.state.title = this.ruleI.title;
                this.state.description = this.ruleI.description;
                this.state.ruleTags = this.ruleI.tags;
                this.state.folderConstraint = this.ruleI.checkForFilesFoldersConstraints;
                this.state.filesFolders = this.ruleI.checkForFilesFolders;
                this.state.tagTable = props.tagTable;
            }
        }

        this.caretClass = {
            true: {cursor: "pointer", color: "black"},
            false: {cursor: "pointer", color: "darkgrey"}
        };

        this.editIconClass = {
            true: {color: "#337ab7", cursor: "pointer"},
            false: {color: "black", cursor: "pointer"}
        };
    }

    render() {
        if (!this.ruleI) return null;
        return (
            <div className={this.state.className}>
                <FormGroup>
                    <div style={{float: "right"}}>
                        <FaCaretUp size={20} onClick={() => this.setState({openPanel: false})}
                                   style={this.caretClass[this.state.openPanel.toString()]}
                                   className={"react-icons"}/>
                        <FaCaretDown size={20} onClick={() => this.setState({openPanel: true})}
                                     style={this.caretClass[(!this.state.openPanel).toString()]}
                                     className={"react-icons"}/>
                    </div>
                    <ControlLabel>{this.state.title}</ControlLabel>
                    <p>{this.state.description}</p>
                </FormGroup>
                <Collapse in={this.state.openPanel}>
                    <div>
                        <div style={{paddingTop: "10px", clear: "both"}}>
                            {this.renderTags()}
                        </div>
                        <div style={{paddingTop: "10px", clear: "both"}}>
                            <Tabs animation={true} id={"rules_" + this.ruleIndex}
                                  activeKey={this.state.activeTab}
                                  onSelect={(key) => {
                                      if (this.state.activeTab === key)
                                          this.setState({activeTab: 0});
                                      else
                                          this.setState({activeTab: key});
                                  }}>
                                <Tab eventKey={0} disabled>{}</Tab>
                                <Tab eventKey={"satisfied"}
                                     title={this.renderTabHeader("satisfied")}>{this.renderListOfSnippets("satisfied")}</Tab>
                                <Tab eventKey={"violated"}
                                     title={this.renderTabHeader("violated")}>{this.renderListOfSnippets("violated")}</Tab>
                            </Tabs>
                        </div>
                    </div>
                </Collapse>
            </div>
        );
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        let newState = {};
        this.ruleIndex = nextProps.ruleIndex !== undefined ? nextProps.ruleIndex : -1;
        let arrayIndex = nextProps.rules.map(d => d.index).indexOf(this.ruleIndex);
        if (this.ruleIndex >= 0) {
            if (arrayIndex === -1)
                console.log(`error: rule with index ${this.ruleIndex} is not found in the ruleTable.
                Only ${nextProps.rules.map(d => d.index).toString()} are found as indices.`);
            else {
                this.ruleI = nextProps.rules[arrayIndex];
                newState = {
                    title: this.ruleI.title,
                    description: this.ruleI.description,
                    ruleTags: this.ruleI.tags,
                    folderConstraint: this.ruleI.checkForFilesFoldersConstraints,
                    filesFolders: this.ruleI.checkForFilesFolders,
                };
            }
        }

        if (nextProps.message === reduxStoreMessages.hash_msg) {
            let panelState = this.newUpdateStateUponCodeChange(nextProps.codeChanged, nextProps.filePath);
            this.setState({...panelState, ...newState, filePath: nextProps.filePath});
        }

        else if (nextProps.message === reduxStoreMessages.file_path_update_msg)
            this.setState({...newState, filePath: nextProps.filePath});

        // existing rule
        else if (nextProps.message === reduxStoreMessages.update_rule_table_msg && this.ruleIndex !== -1) {
            if (arrayIndex !== -1) {
                let panelState = this.newUpdateStateUponCodeChange(nextProps.codeChanged, nextProps.filePath);
                this.setState({...newState, ...panelState, filePath: nextProps.filePath});
            }
        }
    }

    /**
     * set the states "openPanel" and "className" after mounting.
     */
    componentDidMount() {
        let panelState = this.newUpdateStateUponCodeChange(this.props.codeChanged, this.state.filePath);
        this.setState(panelState);
    }

    /**
     * render the tab headers
     * @param group
     */
    renderTabHeader(group) {
        // sum up the number of satisfied and violated
        let totalSatisfied = 0, totalViolated = 0;
        for (let i = 0; i < this.ruleI.xPathQueryResult.length; i++) {
            totalSatisfied += this.ruleI.xPathQueryResult[i].data.satisfied;
            totalViolated += this.ruleI.xPathQueryResult[i].data.violated
        }

        let fileSatisfied = 0, fileViolated = 0;
        let file = this.ruleI.xPathQueryResult.filter(d => d.filePath === this.state.filePath);
        if (file.length > 0) {
            fileSatisfied = file[0].data.satisfied;
            fileViolated = file[0].data.violated;
        }

        switch (group) {
            case "all":
                return (
                    <span className="rulePanelGeneralTab">Matches
                        {this.state.filePath !== none_filePath ? (
                            <Fragment>
                                <Badge className="forAll">{fileSatisfied + fileViolated}</Badge>
                                <span style={{color: "#777"}}>out of</span>
                                <Badge className="forAll">{totalSatisfied + totalViolated}</Badge>
                            </Fragment>
                        ) : (
                            <Badge className="forAll">{totalSatisfied + totalViolated}</Badge>
                        )}
                        <Badge className="forFile hidden">{}</Badge>
                    </span>);
            case "satisfied":
                return (
                    <span className="rulePanelSatisfiedTab">Examples
                        {this.state.filePath !== none_filePath ? (
                            <Fragment>
                                <Badge className="forAll">{fileSatisfied}</Badge>
                                <span style={{color: "#777"}}>out of</span>
                                <Badge className="forAll">{totalSatisfied}</Badge>
                            </Fragment>
                        ) : (
                            <Badge className="forAll">{totalSatisfied}</Badge>
                        )}
                        <Badge className="forFile hidden">{}</Badge>
                    </span>);
            case "violated":
                return (
                    <span className="rulePanelViolatedTab">Violated
                        {this.state.filePath !== none_filePath ? (
                            <Fragment>
                                <Badge className="forAll">{fileViolated}</Badge>
                                <span style={{color: "#777"}}>out of</span>
                                <Badge className="forAll">{totalViolated}</Badge>
                            </Fragment>
                        ) : (
                            <Badge className="forAll">{totalViolated}</Badge>
                        )}
                        <Badge className="forFile hidden">{}</Badge>
                    </span>);
            default:
                break;
        }
    }

    /**
     * render tag badges
     */
    renderTags() {
        return (this.ruleI.tags).map((d, i) => {
            let tagFilter = this.state.tagTable.filter((tt) => tt.tagName === d);
            if (tagFilter.length !== 1) {
                return (
                    <div className="buttonDiv" key={i}>
                        <Label>{d}</Label>
                    </div>)
            }
            return (
                <div className="buttonDiv" key={i}>
                    <Label onClick={() => window.location.hash = `#/${hashConst.tag}/${tagFilter[0].ID}`}>{d}</Label>
                </div>)
        });
    }

    /**
     * create a list div node for quantifier and satisfied result and wrap them in a div
     * @param group {string}
     */
    renderListOfSnippets(group) {

        let otherFilesList = [], fileList = [];
        let file = this.ruleI.xPathQueryResult.filter(d => d.filePath === this.state.filePath);

        switch (group) {
            case "all":
                if (this.state.filePath !== none_filePath) {
                    if (file.length > 0)
                        fileList = file[0].data.quantifierResult;
                }
                for (let i = 0; i < this.ruleI.xPathQueryResult.length; i++) {
                    if (this.ruleI.xPathQueryResult[i].filePath === this.state.filePath) continue;
                    otherFilesList = otherFilesList.concat(this.ruleI.xPathQueryResult[i].data.quantifierResult)
                }
                break;
            case "satisfied":
                if (this.state.filePath !== none_filePath) {
                    if (file.length > 0)
                        fileList = file[0].data.satisfiedResult;
                }
                for (let i = 0; i < this.ruleI.xPathQueryResult.length; i++) {
                    if (this.ruleI.xPathQueryResult[i].filePath === this.state.filePath) continue;
                    otherFilesList = otherFilesList.concat(this.ruleI.xPathQueryResult[i].data.satisfiedResult)
                }
                break;
            case "violated":
                if (this.state.filePath !== none_filePath) {
                    if (file.length > 0)
                        fileList = file[0].data.violatedResult;
                }
                for (let i = 0; i < this.ruleI.xPathQueryResult.length; i++) {
                    if (this.ruleI.xPathQueryResult[i].filePath === this.state.filePath) continue;
                    otherFilesList = otherFilesList.concat(this.ruleI.xPathQueryResult[i].data.violatedResult)
                }
                break;
            default:
                break;
        }

        let returnList = (list) => {
            if (list.length === 0)
                return (<h5>No snippet</h5>);
            return list.map((d, i) => {
                return (
                    <div data-file-path={d.filePath} className="snippetDiv" key={i}>
                                <pre className="link" onClick={() => {
                                    this.props.onIgnoreFile(true);
                                    Utilities.sendToServer(this.props.ws, webSocketSendMessage.snippet_xml_msg, d.xml)
                                }}>
                                    <div className="content" dangerouslySetInnerHTML={{__html: d.snippet}}/>
                                </pre>
                    </div>
                )
            })
        };

        let headerText = group === "all" ? "Matches" : group === "satisfied" ? 
            "Example Snippet" : "Violated snippet";

        return (
            <div>
                {this.state.filePath !== none_filePath ? (
                    <Fragment>
                        <h4>{headerText + " for this file"}</h4>
                        <div>{returnList(fileList)}</div>
                        <h4>{headerText + " for other files"}</h4>
                    </Fragment>
                ) : null}
                <div>{returnList(otherFilesList)}</div>
            </div>
        )
    }


    /**
     * compute the className and state of the panel after the code is changed
     * @param codeChanged
     * @param filePath path of the open file
     * @returns {*}
     */
    newUpdateStateUponCodeChange (codeChanged, filePath) {
        if (!codeChanged) {
            let open;
            if (filePath === none_filePath)
                open = true;
            else
                open = this.ruleI.xPathQueryResult.filter(d => d.filePath === filePath).length > 0;
            return {
                className: "rulePanelDiv" + (this.newRuleRequest ? " edit-bg" : ""),
                openPanel: open
            };
        }

        let file = this.ruleI.xPathQueryResult.filter(d => d.filePath === filePath);
        let ruleIFile = file.length !== 0 ? file[0].data : {};
        if (ruleIFile.allChanged === relatives.greater && ruleIFile.satisfiedChanged === relatives.none 
            && ruleIFile.violatedChanged === relatives.none) {
            return {openPanel: true, className: "rulePanelDiv blue-bg"};
        }
        if (ruleIFile.satisfiedChanged === relatives.greater)
            return{openPanel: true, className: "rulePanelDiv green-bg"};

        if (ruleIFile.violatedChanged === relatives.greater)
            return {openPanel: true, className: "rulePanelDiv red-bg"};

        if (file.length > 0)
            return {openPanel: true, className: "rulePanelDiv"};

        if (ruleIFile.violated === 0)
            return {openPanel: false, className: "rulePanelDiv"};

        return {openPanel: false, className: "rulePanelDiv"};
    }
}

// map state to props
function mapStateToProps(state) {
    return {
        rules: state.ruleTable,
        tagTable: state.tagTable,
        codeChanged: state.currentHash[0] === hashConst.codeChanged,
        filePath: [hashConst.rulesForFile, hashConst.codeChanged].indexOf(state.currentHash[0]) !== -1 ?
            (state.openFilePath) : none_filePath,
        ws: state.ws,
        message: state.message
    };
}

function mapDispatchToProps(dispatch) {
    return {
        onIgnoreFile: (shouldIgnore) => dispatch(ignoreFileChange(shouldIgnore)),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(RulePanel);