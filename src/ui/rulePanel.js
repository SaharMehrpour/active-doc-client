/**
 * Created by saharmehrpour on 9/6/17.
 */

import React, { Component, Fragment } from "react";
import { connect } from "react-redux";

import "../index.css";
import "../App.css";
import {
    Tab, Tabs, Badge, FormGroup, ControlLabel, Label, Collapse
} from "react-bootstrap";
import { FaCaretDown, FaCaretUp } from "react-icons/fa";
import { MdEdit } from "react-icons/md";

import { changeEditMode, ignoreFileChange } from "../actions";
import Utilities from "../core/utilities";
import RulePad from "./RulePad/rulePad";
import { reduxStoreMessages } from "../reduxStoreConstants";
import { webSocketSendMessage } from "../core/coreConstants";
import { relatives } from "../core/ruleExecutorConstants";
import { hashConst, none_filePath } from "./uiConstants";

import { suggestFix } from "../activeLLM/suggestFix";
import Prism from 'prismjs';
import '../../src/prism-vs.css'; // Choose any theme you like

// Import the language syntax for Java
import 'prismjs/components/prism-java';
import { getFileContentToSendToGPT } from "../core/sharedStates";

class RulePanel extends Component {

    constructor(props) {
        super(props);
        this.ruleIndex = props.ruleIndex !== undefined ? props.ruleIndex : -1;
        /**
         * @type {null|{index:number, title:string, description:string, tags:[], grammar:string,
         * checkForFilesFolders:[string], checkForFilesFoldersConstraints:"INCLUDE"|"EXCLUDE"|"NONE",
         * processFilesFolders:"WITHIN",
         * quantifierXPathQuery:[], constraintXPathQuery:[], quantifierQueryType:string, constraintQueryType:string,
         * rulePanelState:{editMode:boolean, title:string, description:string, ruleTags:[], folderConstraint:string,
         * filesFolders:[],
         * constraintXPath:string, quantifierXPath:string, autoCompleteArray:[],
         * graphicalEditorState:{guiTree:{}, guiElements:{}, ruleType:string}},
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

            editMode: this.newRuleRequest,

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

                this.state.editMode = this.ruleI.rulePanelState.editMode;
            }
        }

        this.caretClass = {
            true: { cursor: "pointer", color: "black" },
            false: { cursor: "pointer", color: "darkgrey" }
        };

        this.editIconClass = {
            true: { color: "#337ab7", cursor: "pointer" },
            false: { color: "black", cursor: "pointer" }
        };
    }

    render() {
        if (!this.ruleI && !this.state.editMode) return null;
        if (this.state.editMode)
            return (
                <RulePad ruleIndex={this.ruleIndex}
                    changeEditMode={() => this.changeEditMode()} />);
        return (
            <div className={this.state.className}>
                <FormGroup>
                    <div style={{ float: "right" }}>
                        <FaCaretUp size={20} onClick={() => this.setState({ openPanel: false })}
                            style={this.caretClass[this.state.openPanel.toString()]}
                            className={"react-icons"} />
                        <FaCaretDown size={20} onClick={() => this.setState({ openPanel: true })}
                            style={this.caretClass[(!this.state.openPanel).toString()]}
                            className={"react-icons"} />
                        <MdEdit size={20} style={this.editIconClass[this.state.editMode.toString()]}
                            onClick={() => this.changeEditMode()}
                            className={"react-icons"} />
                    </div>
                    <ControlLabel>{this.state.title}</ControlLabel>
                    <p>{this.state.description}</p>
                </FormGroup>
                <Collapse in={this.state.openPanel}>
                    <div>
                        <div style={{ paddingTop: "10px", clear: "both" }}>
                            {this.renderTags()}
                        </div>
                        <div style={{ paddingTop: "10px", clear: "both" }}>
                            <Tabs animation={true} id={"rules_" + this.ruleIndex}
                                activeKey={this.state.activeTab}
                                onSelect={(key) => {
                                    if (this.state.activeTab === key)
                                        this.setState({ activeTab: 0 });
                                    else
                                        this.setState({ activeTab: key });
                                }}>
                                <Tab eventKey={0} disabled>{ }</Tab>
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
                    editMode: false
                };
            }
        }

        if (nextProps.message === reduxStoreMessages.hash_msg) {
            let panelState = this.newUpdateStateUponCodeChange(nextProps.codeChanged, nextProps.filePath);
            this.setState({ ...panelState, ...newState, filePath: nextProps.filePath });
        }

        else if (nextProps.message === reduxStoreMessages.file_path_update_msg)
            this.setState({ ...newState, filePath: nextProps.filePath });

        else if (nextProps.message === reduxStoreMessages.change_edit_mode_msg) {
            let indices = nextProps.rules.map(d => d.index);
            let arrayIndex = indices.indexOf(this.ruleIndex);
            if (this.ruleIndex !== -1) {
                if (arrayIndex === -1)
                    console.log(`error: rule with index ${this.ruleIndex} is not found in the ruleTable.
                Only ${indices.toString()} are found as indices.`);
                else {
                    this.ruleI = nextProps.rules[arrayIndex];
                    newState.editMode = this.ruleI.rulePanelState.editMode;
                    this.setState({ ...newState, filePath: nextProps.filePath });
                }
            }
        }

        // existing rule
        else if (nextProps.message === reduxStoreMessages.update_rule_table_msg && this.ruleIndex !== -1) {
            if (arrayIndex !== -1) {
                if (this.ruleI.rulePanelState.editMode && !this.state.editMode) {
                    newState.editMode = true;
                    this.setState({ ...newState, filePath: nextProps.filePath });
                }

                else {
                    let panelState = this.newUpdateStateUponCodeChange(nextProps.codeChanged, nextProps.filePath);
                    this.setState({ ...newState, ...panelState, filePath: nextProps.filePath });
                }
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
                                <span style={{ color: "#777" }}>out of</span>
                                <Badge className="forAll">{totalSatisfied + totalViolated}</Badge>
                            </Fragment>
                        ) : (
                            <Badge className="forAll">{totalSatisfied + totalViolated}</Badge>
                        )}
                        <Badge className="forFile hidden">{ }</Badge>
                    </span>);
            case "satisfied":
                return (
                    <span className="rulePanelSatisfiedTab">Examples
                        {this.state.filePath !== none_filePath ? (
                            <Fragment>
                                <Badge className="forAll">{fileSatisfied}</Badge>
                                <span style={{ color: "#777" }}>out of</span>
                                <Badge className="forAll">{totalSatisfied}</Badge>
                            </Fragment>
                        ) : (
                            <Badge className="forAll">{totalSatisfied}</Badge>
                        )}
                        <Badge className="forFile hidden">{ }</Badge>
                    </span>);
            case "violated":
                return (
                    <span className="rulePanelViolatedTab">Violated
                        {this.state.filePath !== none_filePath ? (
                            <Fragment>
                                <Badge className="forAll">{fileViolated}</Badge>
                                <span style={{ color: "#777" }}>out of</span>
                                <Badge className="forAll">{totalViolated}</Badge>
                            </Fragment>
                        ) : (
                            <Badge className="forAll">{totalViolated}</Badge>
                        )}
                        <Badge className="forFile hidden">{ }</Badge>
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

        let exampleSnippet = null;
        let exampleFoundInOpenFile = false;
        let exampleFilePath = null;

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
                    // NOTE: added example snippet
                    if (
                        exampleSnippet == null &&
                        this.ruleI.xPathQueryResult[i].data.satisfiedResult.length > 0
                    ) {
                        try {
                            exampleSnippet =
                                this.ruleI.xPathQueryResult[i].data.satisfiedResult[0]
                                    .surroundingNodes;
                            exampleFilePath = this.ruleI.xPathQueryResult[i].filePath;
                        } catch (e) {
                            console.log(e);
                        }
                    }
                    if (this.ruleI.xPathQueryResult[i].filePath === this.state.filePath) {
                        // NOTE: added example snippet
                        if (
                            (exampleSnippet == null || !exampleFoundInOpenFile) &&
                            this.ruleI.xPathQueryResult[i].data.satisfiedResult.length > 0
                        ) {
                            try {
                                exampleSnippet =
                                    this.ruleI.xPathQueryResult[i].data.satisfiedResult[0]
                                        .surroundingNodes;
                                exampleFoundInOpenFile = true;
                                exampleFilePath = this.ruleI.xPathQueryResult[i].filePath;
                            } catch (e) {
                                console.log(e);
                            }
                            continue;
                        }
                    }
                    otherFilesList = otherFilesList.concat(
                        this.ruleI.xPathQueryResult[i].data.violatedResult,
                    );
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
                    <SnippetView
                        key={i}
                        d={d}
                        snippetGroup={group}
                        exampleSnippet={exampleSnippet}
                        exampleFilePath={exampleFilePath}
                        description={this.state.description}
                        ws={this.props.ws}
                        onIgnoreFile={this.props.onIgnoreFile}
                    />
                );
            });
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
    newUpdateStateUponCodeChange(codeChanged, filePath) {
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
            return { openPanel: true, className: "rulePanelDiv blue-bg" };
        }
        if (ruleIFile.satisfiedChanged === relatives.greater)
            return { openPanel: true, className: "rulePanelDiv green-bg" };

        if (ruleIFile.violatedChanged === relatives.greater)
            return { openPanel: true, className: "rulePanelDiv red-bg" };

        if (file.length > 0)
            return { openPanel: true, className: "rulePanelDiv" };

        if (ruleIFile.violated === 0)
            return { openPanel: false, className: "rulePanelDiv" };

        return { openPanel: false, className: "rulePanelDiv" };
    }

    /**
     * change edit mode, set the states
     */
    changeEditMode() {
        this.props.onChangeEditMode(this.ruleIndex, !this.state.editMode)
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
        onChangeEditMode: (ruleIndex, newEditMode) => dispatch(changeEditMode(ruleIndex, newEditMode))
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(RulePanel);


class SnippetView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            snippetGroup: props.snippetGroup,
            d: props.d,
            description: props.description,
            exampleSnippet: props.exampleSnippet,
            exampleFilePath: props.exampleFilePath,
            suggestedSnippet: null,
            suggestionCreated: false,
            snippetExplanation: null,
            suggestionFileName: null,
            llmModifiedFileContent: null,
        };
    }

    saveConversationToSessionStorage = (key, conversationHistory) => {
        sessionStorage.setItem(key, JSON.stringify(conversationHistory));
    }

    getConversationFromSessionStorage = (key) => {
        const history = sessionStorage.getItem(key);
        return history ? JSON.parse(history) : [];
    }

    clearConversationFromSessionStorage = (key) => {
        sessionStorage.removeItem(key);
    }

    handleSuggestion = async (
        rule,
        example,
        snippet,
        exampleFilePath,
        violationFilePath,
        key
    ) => {
        const parsedSnippet = Utilities.removeSrcmlAnnotations(snippet);
        const parsedExample = Utilities.removeSrcmlAnnotations(example);
        // prevent multiple calls to suggestFix
        if (!this.state.suggestionCreated) {
            const conversationHistory = await suggestFix(
                rule,
                parsedExample,
                parsedSnippet,
                exampleFilePath,
                violationFilePath,
                this.setState.bind(this),
            );

            this.saveConversationToSessionStorage(key, conversationHistory);

            // notify the component that this snippet now has a suggested fix
            this.setState({ suggestionCreated: true });
        }
    };

    generateDiff = (originalCode, modifiedCode) => {
        const normalizeLines = (code) =>
            code.split('\n')
                .map(line =>
                    line.trim()  // Trim leading and trailing whitespace
                        .replace(/\s+/g, ' ')  // Normalize multiple spaces
                        .replace(/\s*<\s*/g, '<')  // Normalize spaces around <
                        .replace(/\s*>\s*/g, '>')  // Normalize spaces around >
                        .replace(/\s*=\s*/g, '=')  // Normalize spaces around =
                        .replace(/\s*\(\s*/g, '(')  // Normalize spaces around (
                        .replace(/\s*\)\s*/g, ')')  // Normalize spaces around )
                        .replace(/\s*\{\s*/g, '{')  // Normalize spaces around {
                        .replace(/\s*\}\s*/g, '}')  // Normalize spaces around }
                )
                .filter(line => line !== '');

        const originalLines = normalizeLines(originalCode);
        const modifiedLines = normalizeLines(modifiedCode);
        const diff = [];

        // Identify added lines
        modifiedLines.forEach(modifiedLine => {
            if (!originalLines.includes(modifiedLine)) {
                diff.push({ type: 'added', text: modifiedLine });
            }
        });

        // Identify removed lines
        originalLines.forEach(originalLine => {
            if (!modifiedLines.includes(originalLine)) {
                diff.push({ type: 'removed', text: originalLine });
            }
        });

        // Update the state with the generated diff
        //this.setState({ diff });

        return diff;
    };


    renderDiff = () => {
        const originalCode = Utilities.removeSrcmlAnnotations(this.state.d.surroundingNodes);
        const modifiedCode = this.state.suggestedSnippet;
        const diff = this.generateDiff(originalCode, modifiedCode);

        const highlightCode = (code) => {
            return Prism.highlight(code, Prism.languages.java, 'java');
        };

        return (
            <div className="diff-container" style={{ fontFamily: 'monospace', whiteSpace: 'pre', border: '1px solid #d6d6d6', borderRadius:'7px', padding: '1px' }}>
                {diff.map((line, index) => (
                    <div
                        key={index}
                        style={{
                            backgroundColor: 'white'
                        }}
                    >
                        <span style={{ color: line.type === 'added' ? 'green' : 'red' }}>
                            {line.type === 'added' ? '+' : '-'}
                        </span>
                        <span dangerouslySetInnerHTML={{ __html: highlightCode(line.text) }}></span>
                    </div>
                ))}
            </div>
        );
    };

    render() {

        const fileContentToSendToGPT = getFileContentToSendToGPT();
        const uniqueKey = this.state.d.filePath;
        // NOTE: These styles can be moved to index.css in the future.
        // There was an issue with that, so this is a quick fix
        const titleStyle = {
            color: "#333",
            fontSize: "1.10em",
            width: "100%",
            fontWeight: "bold",
        };

        const buttonStyle = {
            marginTop: "2px",
            marginRight: "2.5px",
            backgroundColor: "#777",
            color: "white",
            border: "none",
            borderRadius: "5px",
            paddingRight: "5px",
            paddingLeft: "5px",
            fontWeight: "bold",
            cursor: "pointer",
            outline: "none",
        };

        const buttonParent = {
            position: "absolute",
            top: "0",
            right: "0",
            zIndex: "1",
        };

        const containerStyle = {
            display: "flex",
            flexDirection: "column",
            width: "100%",
        };

        const paneStyle = {
            padding: "10px",
            borderBottom: "1px solid #ddd",
        };

        // Store the API key in a variable
        const apiKey = localStorage.getItem("OPENAI_API_KEY");

        const highlightCode = (code) => {
            return Prism.highlight(code, Prism.languages.java, 'java');
        };

        return (
            <section>
                <div
                    data-file-path={this.state.d.filePath}
                    className="snippetDiv"
                    style={{ position: "relative" }}
                >
                    <div
                        className="link"
                        onClick={() => {
                            this.props.onIgnoreFile(true);
                            Utilities.sendToServer(
                                this.props.ws,
                                webSocketSendMessage.snippet_xml_msg,
                                this.state.d.xml,
                            );
                        }}
                    >
                        <pre
                            className="content"
                            dangerouslySetInnerHTML={{ __html: highlightCode(Utilities.removeSrcmlAnnotations(this.state.d.snippet)) }}
                        />

                        <span style={buttonParent}>
                            {/* render the following IF this is a violation of a rule and there is no fix yet */}
                            {this.state.snippetGroup === "violated" &&
                                // Use the apiKey variable in the conditional rendering check
                                apiKey !== null &&
                                apiKey !== "" &&
                                !this.state.suggestedSnippet && (
                                    <button
                                        onClick={() =>
                                            this.handleSuggestion(
                                                this.state.description,
                                                this.state.exampleSnippet,
                                                this.state.d.surroundingNodes,
                                                this.state.exampleFilePath,
                                                this.state.d.filePath,
                                                uniqueKey
                                            )
                                        }
                                        style={buttonStyle}
                                    >
                                        Fix ✨
                                    </button>
                                )}
                        </span>
                    </div>

                    {this.state.suggestionCreated && !this.state.suggestedSnippet && (
                        <h2 style={{ color: 'black', fontSize: '1.25em', fontWeight:'bold' ,textAlign: 'center' }}>Loading Fix...</h2>
                    )}

                    {this.state.suggestedSnippet && (
                        <div style={containerStyle}>
                            <div style={paneStyle}>
                                {/*                                <h2 style={titleStyle}>Suggested Fix:</h2>
                                <pre
                                    className="content"
                                    dangerouslySetInnerHTML={{ __html: highlightCode(this.state.suggestedSnippet) }}
                                />*/}

                                <h2 style={titleStyle}>Suggestion Location:</h2>
                                <p
                                    className="content"
                                    dangerouslySetInnerHTML={{
                                        __html: this.state.suggestionFileName,
                                    }}
                                />
                                <h2 style={titleStyle}>Explanation:</h2>
                                <p
                                    className="content"
                                    dangerouslySetInnerHTML={{
                                        __html: this.state.snippetExplanation,
                                    }}
                                />

                                <button
                                    onClick={() => {
                                        this.props.onIgnoreFile(true);
                                        Utilities.sendToServer(
                                            this.props.ws,
                                            webSocketSendMessage.llm_modified_file_content,
                                            {
                                                llmModifiedFileContent: this.state.llmModifiedFileContent,
                                                violatedCode: Utilities.removeSrcmlAnnotations(this.state.d.surroundingNodes)
                                            }

                                        );
                                        console.log(this.state.llmModifiedFileContent);
                                    }}
                                    style={buttonStyle}
                                >
                                    Accept Fix
                                </button>
                                <button
                                    onClick={() => {
                                        this.props.onIgnoreFile(true);
                                        Utilities.sendToServer(
                                            this.props.ws,
                                            webSocketSendMessage.send_info_for_edit_fix,
                                            this.state.llmModifiedFileContent,

                                        );
                                    }}
                                    style={{ ...buttonStyle, marginLeft: '10px' }} // Inline styling for the new button
                                >
                                    Edit Fix
                                </button>


                            </div>
                            <div style={paneStyle}>
                                <h2 style={titleStyle}>Suggested Fix:</h2>
                                {this.renderDiff()}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        );
    }
    UNSAFE_componentWillReceiveProps(nextProps) {
        this.setState({
            snippetGroup: nextProps.snippetGroup,
            d: nextProps.d,
            description: nextProps.description,
            exampleSnippet: nextProps.exampleSnippet,
            exampleFilePath: nextProps.exampleFilePath
        });
    }
}