import * as _ from 'lodash';
import * as Hammer from 'hammerjs';
import {
    Component,
    ElementRef,
    Host,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    TemplateRef
} from '@angular/core';
import {Content} from 'ionic-angular';
import {OrderBy} from './order-by';
import {AlphaScrollService} from './alpha-scroll.service';

const ALPHABETS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

@Component({
    selector: 'ion-alpha-scroll',
    template: `
        <ion-list class="ion-alpha-list">
            <div *ngFor="let item of sortedItems">
                <ion-item-divider id="scroll-letter-{{item.letter}}" *ngIf="item.isDivider">{{item.letter}}
                </ion-item-divider>
                <ng-container *ngIf="!item.isDivider">
                    <ng-container
                            *ngTemplateOutlet="itemTemplate; context: {'item': item, 'currentPageClass': currentPageClass}">
                    </ng-container>
                </ng-container>
            </div>
        </ion-list>
        <ul ion-fixed class="ion-alpha-sidebar" [ngStyle]="calculateDimensionsForSidebar()">
            <li *ngFor="let alpha of alphabet" [class]="setAlphaClass(alpha)" tappable
                (click)="alphaScrollGoToList(alpha.letter)">
                <a>{{alpha.letter}}</a>
            </li>
        </ul>
    `,
    styles: [`
        .ion-alpha-list {
            padding-right: 20px;
        }

        .ion-alpha-list .item {
            border-right: none;
        }

        .ion-alpha-sidebar {
            position: fixed;
            right: 0;
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            z-index: 50000;
        }

        .ion-alpha-sidebar li {
            line-height: 1.1;
            list-style: none;
            width: 20px;
            text-align: center;
        }

        .ion-alpha-letter-indicator {
            -webkit-transition: opacity 150ms ease-in-out;
            transition: opacity 150ms ease-in-out;
            opacity: 1;
            background-color: rgba(0, 0, 0, 0.4);
            position: absolute;
            width: 100px;
            height: 100px;
            color: white;
            display: flex;
            visibility: hidden;
            justify-content: center;
            align-items: center;
            font-size: 3em;
            z-index: 999;
        }

        .ion-alpha-invalid a {
            color: #cccccc;
        }

        .ion-alpha-active a {
            color: darkkhaki !important;
        }
    `]
})
export class AlphaScrollComponent implements OnInit, OnChanges, OnDestroy {
    @Input() listData: any;
    @Input() key: string;
    @Input() itemTemplate: TemplateRef<Object>;
    @Input() currentPageClass: any;
    private letterIndicatorEle: HTMLElement;
    private indicatorHeight: number;
    private indicatorWidth: number;
    sortedItems: any = [];
    alphabet: any = [];

    constructor(private elementRef: ElementRef, private orderBy: OrderBy,
                private alphaScrollService: AlphaScrollService, @Host() private content: Content) {
        this.letterIndicatorEle = document.createElement('div');
        this.letterIndicatorEle.className = 'ion-alpha-letter-indicatorc';
        let body = document.getElementsByTagName('body')[0];
        body.appendChild(this.letterIndicatorEle);
    }

    ngOnInit() {
        setTimeout(() => {
            this.indicatorWidth = this.letterIndicatorEle.offsetWidth;
            this.indicatorHeight = this.letterIndicatorEle.offsetHeight;
            this.setupHammerHandlers();
        });
    }

    ngOnChanges() {
        console.log('ngOnChanges')
        let sortedListData: Array<any> = this.orderBy.transform(this.listData, [this.key]);
        let groupItems: any = _.groupBy(sortedListData, item => {
            let letter: any = _.get(item, this.key);
            console.log('letter:' + letter);
            let tmp = this.alphaScrollService.toPinyin(letter.substr(0, 1));
            if (tmp !== 'undefined') {
                letter = tmp;
            }
            console.log('letter2:' + letter);
            return letter.toUpperCase().charAt(0);
        });
        const iteratedObj = this.iterateAlphabet(groupItems);
        this.sortedItems = iteratedObj.sortedItems;
        this.alphabet = iteratedObj.alphabets;
    }

    ngOnDestroy() {
        if (this.letterIndicatorEle) {
            this.letterIndicatorEle.remove();
        }
    }

    setAlphaClass(alpha: any): string {
        return alpha.isActive ? 'ion-alpha-active' : 'ion-alpha-invalid';
    }

    calculateDimensionsForSidebar() {
        return {
            top: this.content.contentTop + 'px',
            height: (this.content.getContentDimensions().contentHeight - 28) + 'px'
        };
    }

    alphaScrollGoToList(letter: any) {
        let ele: any = this.elementRef.nativeElement.querySelector(`#scroll-letter-${letter}`);
        if (ele) {
            this.content.scrollTo(0, ele.offsetTop);
        }
    }

    private setupHammerHandlers() {
        let sidebarEle: HTMLElement = this.elementRef.nativeElement.querySelector('.ion-alpha-sidebar');

        if (!sidebarEle) return;

        let mcHammer = new Hammer(sidebarEle, {
            recognizers: [
                [Hammer.Pan, {direction: Hammer.DIRECTION_VERTICAL}],
            ]
        });

        mcHammer.on('panstart', () => {
            this.letterIndicatorEle.style.top = ((window.innerHeight - this.indicatorHeight) / 2) + 'px';
            this.letterIndicatorEle.style.left = ((window.innerWidth - this.indicatorWidth) / 2) + 'px';
            this.letterIndicatorEle.style.visibility = 'visible';
        });

        mcHammer.on('panend pancancel', () => {
            this.letterIndicatorEle.style.visibility = 'hidden';
        });

        mcHammer.on('panup pandown', _.throttle((e: any) => {
            let closestEle: any = document.elementFromPoint(e.center.x, e.center.y);
            if (closestEle && ['LI', 'A'].indexOf(closestEle.tagName) > -1) {
                let letter = closestEle.innerText;
                this.letterIndicatorEle.innerText = letter;
                let letterDivider: any = this.elementRef.nativeElement.querySelector(`#scroll-letter-${letter}`);
                if (letterDivider) {
                    this.content.scrollTo(0, letterDivider.offsetTop);
                }
            }
        }, 50));
    }

    private iterateAlphabet(groupItems: any): { alphabets: Array<any>, sortedItems: Array<any> } {
        let result = {alphabets: [], sortedItems: []};
        for (let i = 0; i < ALPHABETS.length; i++) {
            const letter = ALPHABETS.charAt(i);
            const isActive = groupItems[letter] ? true : false;
            result.alphabets.push({letter: letter, isActive: isActive});

            if (!isActive) continue;

            result.sortedItems = result.sortedItems.concat([{
                isDivider: true,
                letter: letter
            }].concat(groupItems[letter]));
        }

        let otherItems = [{isDivider: true, letter: '其它'}];
        for (let letter in groupItems) {
            if (ALPHABETS.indexOf(letter) !== -1) continue;
            otherItems = otherItems.concat(groupItems[letter]);
        }

        if (otherItems.length > 1) {
            result.sortedItems = result.sortedItems.concat(otherItems);
        }

        return result;
    }
}
